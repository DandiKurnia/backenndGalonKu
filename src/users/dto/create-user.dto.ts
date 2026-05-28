import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string('Name must be a string').min(1, 'Name is required'),
  email: z.string('Email must be a string').email('Invalid email format'),
  password: z
    .string('Password must be a string')
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .max(20, 'Password must be at most 20 characters long'),
  phone_number: z
    .string('Phone number must be a string')
    .min(1, 'Phone number is required')
    .min(10, 'Phone number must be at least 10 digits long')
    .max(15, 'Phone number must be at most 15 digits long'),
  roleId: z
    .number('Role id must be a number')
    .int('Role id must be an integer')
    .positive('Role id must be a positive number'),
  addressId: z
    .number('Address id must be a number')
    .int('Address id must be an integer')
    .positive('Address id must be a positive number')
    .optional(),
});

export class CreateUserDto {
  static schema: z.ZodObject<any> = createUserSchema;

  constructor(
    public name: string,
    public email: string,
    public password: string,
    public phone_number: string,
    public roleId: number,
    public addressId?: number,
  ) {}
}
