import z from 'zod';

const createAddress = z.object({
  name: z
    .string('Name must be string')
    .min(3, 'Name must be at least 3 characters long'),
  address: z
    .string('Address must be string')
    .min(3, 'Address must be at least 3 characters long'),
});

export class CreateAddressDto {
  static schema: z.ZodType<any> = createAddress;
  constructor(
    public name: string,
    public address: string,
  ) {}
}
