import z from 'zod';

const createAddress = z.object({
  name: z
    .string('Name must be string')
    .min(3, 'Name must be at least 3 characters long'),
  address: z
    .string('Address must be string')
    .min(3, 'Address must be at least 3 characters long'),
  latitude: z
    .number('Latitude must be number')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number('Longitude must be number')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
});

export class CreateAddressDto {
  static schema: z.ZodType<any> = createAddress;
  constructor(
    public name: string,
    public address: string,
    public latitude?: number,
    public longitude?: number,
  ) {}
}
