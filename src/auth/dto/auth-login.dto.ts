import z, { ZodObject } from 'zod';

export const authLoginSchema = z.object({
  email: z
    .string('Email is required and must be a string')
    .email('Email must be a valid email address'),
  password: z
    .string('Password is required and must be a string')
    .min(8, 'Password must be at least 8 characters long'),
});

export class AuthLoginDto {
  static schema: ZodObject<any> = authLoginSchema;

  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
