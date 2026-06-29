import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UserPublic } from '../auth/types/auth-response.type';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { DeleteAccountDto } from './dto/delete-account.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const DELETE_CONFIRMATION = 'ВИДАЛИТИ';

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
        throw new BadRequestException('Аватар має бути посиланням http(s) або шляхом /uploads/');
      }
      data.avatarUrl = url || null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Немає полів для оновлення');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Новий пароль має відрізнятися від поточного');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('Користувача не знайдено');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Невірний поточний пароль');
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

    return { message: 'Пароль змінено. Увійдіть знову.' };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<{ message: string }> {
    if (dto.confirmation !== DELETE_CONFIRMATION) {
      throw new BadRequestException('Для підтвердження введіть ВИДАЛИТИ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('Користувача не знайдено');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Невірний поточний пароль');
    }

    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Неможливо видалити останнього адміністратора.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Сесії, закладки, заявки та ігри майстра — через onDelete: Cascade у schema.
      await tx.user.delete({ where: { id: userId } });
    });

    return { message: 'Акаунт видалено.' };
  }

  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, status: UserStatus.ACTIVE },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('Користувача не знайдено');
    return user;
  }

  async adminList(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search?.trim()
      ? {
          OR: [
            { email: { contains: search.trim(), mode: 'insensitive' as const } },
            { displayName: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminUpdateRole(userId: string, role: UserRole): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Користувача не знайдено');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: USER_SELECT,
    });
  }
}
