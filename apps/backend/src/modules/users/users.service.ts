import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UserPublic } from '../auth/types/auth-response.type';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  avatarUrl: true,
  bio: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PUBLIC_PROFILE_SELECT = {
  id: true,
  displayName: true,
  role: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserPublic> {
    const data: Record<string, string | null> = {};

    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    if (dto.bio !== undefined) data.bio = dto.bio.trim() || null;
    if (dto.avatarUrl !== undefined) {
      const url = dto.avatarUrl.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/uploads/')) {
        throw new BadRequestException('avatarUrl must be http(s) URL or /uploads/ path');
      }
      data.avatarUrl = url || null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password changed. Please sign in again.' };
  }

  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, status: UserStatus.ACTIVE },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async adminList(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
