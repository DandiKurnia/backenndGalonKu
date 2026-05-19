import z from 'zod';

const createTransactionSchema = z
  .object({
    total_galon: z
      .number({ error: 'Total galon must be a number' })
      .min(1, 'Total galon must be at least 1'),
    device_code: z.string({ error: 'Device code is required' }),
  })
  .transform((data) => ({
    totalGalon: data.total_galon,
    deviceCode: data.device_code,
  }));

export class CreateTransactionDto {
  static schema: z.ZodType<any> = createTransactionSchema;

  constructor(
    public totalGalon: number,
    public deviceCode: string,
  ) {}
}
