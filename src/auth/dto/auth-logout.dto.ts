import z, { ZodObject } from 'zod';

export const authLogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthLogoutDto {
  static schema: ZodObject<any> = authLogoutSchema;
  constructor(public readonly refreshToken: string) {}
}
