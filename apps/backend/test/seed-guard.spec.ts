import { resolveSeedPlan, UnsafeSeedConfigError } from '../prisma/seed-guard';

const STRONG = 'Str0ng-Production-Pass';

describe('seed-guard', () => {
  describe('поза production', () => {
    it('використовує локальні демо-значення за замовчуванням', () => {
      const plan = resolveSeedPlan({ NODE_ENV: 'development' });
      expect(plan.production).toBe(false);
      expect(plan.admin.email).toBe('admin@inrium.local');
      expect(plan.editor).not.toBeNull();
      expect(plan.gm).not.toBeNull();
      expect(plan.includeDemoGamesAndCommunities).toBe(true);
    });

    it('приймає явні значення', () => {
      const plan = resolveSeedPlan({ NODE_ENV: 'test', SEED_ADMIN_EMAIL: 'a@b.test', SEED_ADMIN_PASSWORD: 'x' });
      expect(plan.admin).toEqual({ email: 'a@b.test', password: 'x' });
    });

    it('вимагає email і пароль разом', () => {
      expect(() => resolveSeedPlan({ NODE_ENV: 'development', SEED_ADMIN_EMAIL: 'a@b.test' })).toThrow(
        UnsafeSeedConfigError,
      );
    });
  });

  describe('production', () => {
    const base = { NODE_ENV: 'production' };

    it('заблоковано без ALLOW_PRODUCTION_SEED=true', () => {
      expect(() =>
        resolveSeedPlan({ ...base, SEED_ADMIN_EMAIL: 'admin@mysite.org', SEED_ADMIN_PASSWORD: STRONG }),
      ).toThrow(/ALLOW_PRODUCTION_SEED/);
    });

    it('не підставляє демо-значення: потребує явного адміна', () => {
      expect(() => resolveSeedPlan({ ...base, ALLOW_PRODUCTION_SEED: 'true' })).toThrow(/SEED_ADMIN_EMAIL/);
    });

    it.each(['Admin12345!', 'admin12345!', 'Editor12345!', 'Gm12345!', 'password123'])(
      'відхиляє відомий демо-пароль %s',
      (password) => {
        expect(() =>
          resolveSeedPlan({
            ...base,
            ALLOW_PRODUCTION_SEED: 'true',
            SEED_ADMIN_EMAIL: 'admin@mysite.org',
            SEED_ADMIN_PASSWORD: password,
          }),
        ).toThrow(UnsafeSeedConfigError);
      },
    );

    it.each(['short1A', 'onlyletterspassword', '123456789012345'])('відхиляє слабкий пароль %s', (password) => {
      expect(() =>
        resolveSeedPlan({
          ...base,
          ALLOW_PRODUCTION_SEED: 'true',
          SEED_ADMIN_EMAIL: 'admin@mysite.org',
          SEED_ADMIN_PASSWORD: password,
        }),
      ).toThrow(/пароль/i);
    });

    it.each(['admin@inrium.local', 'a@example.com', 'a@localhost', 'a@host.test'])(
      'відхиляє службовий домен %s',
      (email) => {
        expect(() =>
          resolveSeedPlan({
            ...base,
            ALLOW_PRODUCTION_SEED: 'true',
            SEED_ADMIN_EMAIL: email,
            SEED_ADMIN_PASSWORD: STRONG,
          }),
        ).toThrow(UnsafeSeedConfigError);
      },
    );

    it('із коректними даними створює лише адміна без демо-користувачів, ігор і спільнот', () => {
      const plan = resolveSeedPlan({
        ...base,
        ALLOW_PRODUCTION_SEED: 'true',
        SEED_ADMIN_EMAIL: 'admin@mysite.org',
        SEED_ADMIN_PASSWORD: STRONG,
      });
      expect(plan.production).toBe(true);
      expect(plan.editor).toBeNull();
      expect(plan.gm).toBeNull();
      expect(plan.includeDemoGamesAndCommunities).toBe(false);
    });

    it('редактор/GM у production теж проходять перевірку', () => {
      expect(() =>
        resolveSeedPlan({
          ...base,
          ALLOW_PRODUCTION_SEED: 'true',
          SEED_ADMIN_EMAIL: 'admin@mysite.org',
          SEED_ADMIN_PASSWORD: STRONG,
          SEED_EDITOR_EMAIL: 'editor@inrium.local',
          SEED_EDITOR_PASSWORD: 'Editor12345!',
        }),
      ).toThrow(UnsafeSeedConfigError);
    });
  });
});
