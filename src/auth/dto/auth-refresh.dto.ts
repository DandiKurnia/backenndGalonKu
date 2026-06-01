import z, { ZodObject } from 'zod';

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthRefreshDto {
  static schema: ZodObject<any> = authRefreshSchema;
  constructor(public readonly refreshToken: string) {}
}
