import { z } from 'zod';

const createDeviceSchema = z.object({
  address_id: z
    .number('Address id must be a number')
    .int('Address id must be an integer')
    .positive('Address id must be a positive number'),
  name: z
    .string('Device name must be a string')
    .min(1, 'Device name is required'),
});

export class CreateDeviceDto {
  static schema: z.ZodObject<any> = createDeviceSchema;

  constructor(
    public address_id: number,
    public name: string,
  ) {}
}
