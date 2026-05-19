import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as QRCode from 'qrcode';

@Injectable()
export class QrcodeService {
  private readonly uploadPath = join(
    process.cwd(),
    'public',
    'uploads',
    'qrcodes',
  );

  constructor() {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async generateQrCode(deviceNumber: string): Promise<string> {
    try {
      const fileName = `${deviceNumber}_${Date.now()}.png`;
      const filePath = join(this.uploadPath, fileName);

      await QRCode.toFile(filePath, deviceNumber);
      return `/uploads/qrcodes/${fileName}`;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate QR Code:' + deviceNumber);
    }
  }
}
