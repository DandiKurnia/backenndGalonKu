# Device Token Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement static `x-device-token` auth so ESP32 can call device endpoints without JWT.

**Architecture:** Each device gets a random token at creation, stored as bcrypt hash in DB. ESP32 sends `x-device-code` + `x-device-token` headers. A `DeviceAuthGuard` validates the pair. Admin can rotate/revoke tokens via protected endpoints. Status endpoint moves to a separate public-with-device-auth controller.

**Tech Stack:** NestJS, Prisma, bcrypt (already installed), crypto (Node built-in)

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `prisma/schema.prisma:78-97` | Add token fields to Device model |
| Create | `prisma/migrations/...add_device_token_fields` | Migration |
| Modify | `src/common/enum/device-status.ts` | No change needed |
| Modify | `src/devices/devices.service.ts` | Token generation on create, rotate/revoke/status methods |
| Create | `src/auth/guards/device-auth.guard.ts` | DeviceAuthGuard |
| Create | `src/devices/devices-public.controller.ts` | ESP32-facing controller (no JWT) |
| Modify | `src/devices/devices.controller.ts` | Remove broken `getStatus`, add rotate/revoke admin endpoints |
| Modify | `src/devices/devices.module.ts` | Register DeviceAuthGuard |
| Modify | `src/devices/dto/create-device.dto.ts` | No change needed |
| Modify | `src/devices/devices.service.spec.ts` | Update tests |
| Modify | `src/devices/devices.controller.spec.ts` | Update tests |

---

### Task 1: Prisma Schema — Add Token Fields

**Files:**
- Modify: `prisma/schema.prisma:78-97`

- [ ] **Step 1: Add fields to Device model**

```prisma
model Device {
  id               Int       @id @default(autoincrement())
  deviceCode       String?   @unique @map("device_code")
  qrCodeUrl        String?   @map("qr_code_url")
  name             String
  qrStatus         String    @map("qr_status")
  lastActive       DateTime  @default(now()) @map("last_active")
  statusDevice     String?   @map("status_device")

  deviceTokenHash  String?   @map("device_token_hash")
  tokenIssuedAt    DateTime? @map("token_issued_at")
  tokenRevokedAt   DateTime? @map("token_revoked_at")

  addressId Int @map("address_id")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @map("updated_at")

  address       Address         @relation(fields: [addressId], references: [id])
  transactions  Transaction[]
  waterFillLogs waterFillLogs[]

  @@map("devices")
}
```

- [ ] **Step 2: Generate migration**

Run:
```bash
npx prisma migrate dev --name add_device_token_fields
```
Expected: migration created, Prisma client regenerated.

- [ ] **Step 3: Verify Prisma client compiles**

Run:
```bash
npx prisma generate
```
Expected: `Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add device token fields to schema"
```

---

### Task 2: Token Generator Utility

**Files:**
- Create: `src/common/utils/device-token.util.ts`

- [ ] **Step 1: Create token generator**

```ts
import { randomBytes } from 'crypto';
import { hashSync, compareSync } from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;
const TOKEN_BYTE_LENGTH = 32;

export function generateDeviceToken(): { rawToken: string; hash: string } {
  const rawToken = `dtkn_${randomBytes(TOKEN_BYTE_LENGTH).toString('hex')}`;
  const hash = hashSync(rawToken, BCRYPT_SALT_ROUNDS);
  return { rawToken, hash };
}

export function hashDeviceToken(rawToken: string): string {
  return hashSync(rawToken, BCRYPT_SALT_ROUNDS);
}

export function verifyDeviceToken(
  rawToken: string,
  storedHash: string,
): boolean {
  return compareSync(rawToken, storedHash);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/common/utils/device-token.util.ts
git commit -m "feat: add device token generator utility"
```

---

### Task 3: DevicesService — Token on Create + rotate/revoke

**Files:**
- Modify: `src/devices/devices.service.ts`

- [ ] **Step 1: Import token util**

Add at top of `src/devices/devices.service.ts`:
```ts
import { generateDeviceToken } from 'src/common/utils/device-token.util';
```

- [ ] **Step 2: Update `create()` return type to include rawToken**

Change the `create` method so it returns `{ device: Device, rawDeviceToken: string }`. Inside the transaction, after creating the device and before returning, generate and store the token hash:

```ts
async create(
  createDeviceDto: CreateDeviceDto,
): Promise<{ device: Device; rawDeviceToken: string }> {
  return await this.prisma.$transaction(async (prisma) => {
    // ... existing address + name validation (unchanged) ...

    const { rawToken, hash } = generateDeviceToken();

    const device = await prisma.device.create({
      data: {
        addressId: createDeviceDto.address_id,
        name: createDeviceDto.name,
        statusDevice: DeviceStatus.ACTIVE,
        lastActive: new Date(),
        qrStatus: DeviceStatus.WAITING,
        deviceTokenHash: hash,
        tokenIssuedAt: new Date(),
      },
    });

    const deviceCode = `DEV-${device.id}`;

    let qrcodeImagePath: string | null = null;
    try {
      qrcodeImagePath = await this.qrcodeService.generateQrCode(deviceCode);
    } catch (error) {
      console.log(`Failed to generate QR Code:`, error);
      throw new BadRequestException('Failed to generate QR Code');
    }

    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        deviceCode: deviceCode,
        qrCodeUrl: qrcodeImagePath,
      },
    });

    return { device: updatedDevice, rawDeviceToken: rawToken };
  });
}
```

- [ ] **Step 3: Add `rotateToken()` method**

```ts
async rotateToken(deviceId: number): Promise<{ rawDeviceToken: string }> {
  const device = await this.prisma.device.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });

  if (!device) {
    throw new BadRequestException('Device not found');
  }

  const { rawToken, hash } = generateDeviceToken();

  await this.prisma.device.update({
    where: { id: deviceId },
    data: {
      deviceTokenHash: hash,
      tokenIssuedAt: new Date(),
      tokenRevokedAt: null,
    },
  });

  return { rawDeviceToken: rawToken };
}
```

- [ ] **Step 4: Add `revokeToken()` method**

```ts
async revokeToken(deviceId: number): Promise<void> {
  const device = await this.prisma.device.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });

  if (!device) {
    throw new BadRequestException('Device not found');
  }

  await this.prisma.device.update({
    where: { id: deviceId },
    data: {
      tokenRevokedAt: new Date(),
    },
  });
}
```

- [ ] **Step 5: Fix `getStatus()` signature to match existing code**

Current code already correct from user's edit. Keep as-is:
```ts
async getStatus(deviceCode: string): Promise<string> {
  const device = await this.prisma.device.findUnique({
    where: { deviceCode: deviceCode },
    select: { qrStatus: true },
  });

  if (!device) {
    throw new BadRequestException('Device not found');
  }

  return device.qrStatus as string;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/devices/devices.service.ts
git commit -m "feat: add device token generation on create, rotate and revoke methods"
```

---

### Task 4: DeviceAuthGuard

**Files:**
- Create: `src/auth/guards/device-auth.guard.ts`

- [ ] **Step 1: Write DeviceAuthGuard**

```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { verifyDeviceToken } from 'src/common/utils/device-token.util';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const deviceCode = request.headers['x-device-code'] as string | undefined;
    const deviceToken = request.headers['x-device-token'] as
      | string
      | undefined;

    if (!deviceCode || !deviceToken) {
      throw new UnauthorizedException('Missing device credentials');
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceCode },
      select: {
        id: true,
        deviceCode: true,
        deviceTokenHash: true,
        tokenRevokedAt: true,
      },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device');
    }

    if (!device.deviceTokenHash) {
      throw new UnauthorizedException('Device has no token configured');
    }

    if (device.tokenRevokedAt) {
      throw new UnauthorizedException('Device token revoked');
    }

    const isValid = verifyDeviceToken(deviceToken, device.deviceTokenHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid device token');
    }

    // Cross-check: header deviceCode must match param :code if present
    const paramCode = request.params?.code;
    if (paramCode && paramCode !== deviceCode) {
      throw new UnauthorizedException('Device code mismatch');
    }

    // Attach device info to request for downstream use
    request.device = {
      id: device.id,
      deviceCode: device.deviceCode,
    };

    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/auth/guards/device-auth.guard.ts src/common/utils/device-token.util.ts
git commit -m "feat: add DeviceAuthGuard for x-device-token auth"
```

---

### Task 5: DevicesPublicController — ESP32 Routes

**Files:**
- Create: `src/devices/devices-public.controller.ts`
- Modify: `src/devices/devices.controller.ts` (remove getStatus)
- Modify: `src/devices/devices.module.ts` (register new controller)

- [ ] **Step 1: Remove `getStatus` from `devices.controller.ts`**

Delete lines 85-98 from `devices.controller.ts` (the `@Get('code/:code/status')` method). Also remove any unused `@Req` import if applicable.

- [ ] **Step 2: Create `devices-public.controller.ts`**

```ts
import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';
import { BaseResponse } from 'src/common/interface/base-response.interface';

@Controller('devices/code')
@UseGuards(DeviceAuthGuard)
export class DevicesPublicController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':code/status')
  async getStatus(
    @Param('code') code: string,
  ): Promise<BaseResponse<{ qrStatus: string }>> {
    const result = await this.devicesService.getStatus(code);

    return {
      data: {
        qrStatus: result,
      },
      message: 'Device status retrieved successfully',
    };
  }
}
```

- [ ] **Step 3: Register in `devices.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesPublicController } from './devices-public.controller';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { QrcodeService } from 'src/qrcode/qrcode.service';

@Module({
  controllers: [DevicesController, DevicesPublicController],
  providers: [DevicesService, PrismaService, QrcodeService],
})
export class DevicesModule {}
```

- [ ] **Step 4: Commit**

```bash
git add src/devices/devices.controller.ts src/devices/devices-public.controller.ts src/devices/devices.module.ts
git commit -m "feat: split ESP32 device status route to public controller with DeviceAuthGuard"
```

---

### Task 6: Admin Rotate/Revoke Endpoints

**Files:**
- Modify: `src/devices/devices.controller.ts`

- [ ] **Step 1: Add rotate endpoint to `DevicesController`**

```ts
@Post(':id/rotate-token')
@RequirePermissions('devices.update')
async rotateToken(
  @Param('id') id: string,
): Promise<BaseResponse<{ rawDeviceToken: string }>> {
  const result = await this.devicesService.rotateToken(+id);
  return {
    data: result,
    message: 'Device token rotated successfully. Store this token securely — it will not be shown again.',
  };
}
```

- [ ] **Step 2: Add revoke endpoint to `DevicesController`**

```ts
@Post(':id/revoke-token')
@RequirePermissions('devices.update')
async revokeToken(
  @Param('id') id: string,
): Promise<BaseResponse<null>> {
  await this.devicesService.revokeToken(+id);
  return {
    data: null,
    message: 'Device token revoked successfully',
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/devices/devices.controller.ts
git commit -m "feat: add admin rotate and revoke device token endpoints"
```

---

### Task 7: Update `create()` Response DTO

**Files:**
- Modify: `src/devices/devices.controller.ts`

- [ ] **Step 1: Update create endpoint response to include rawDeviceToken**

```ts
@Post()
@RequirePermissions('devices.create')
async create(
  @Body() createDeviceDto: CreateDeviceDto,
): Promise<BaseResponse<{ device: Device; rawDeviceToken: string }>> {
  const result = await this.devicesService.create(createDeviceDto);
  return {
    data: result,
    message: 'Device created successfully. Store the rawDeviceToken securely — it will not be shown again.',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/devices/devices.controller.ts
git commit -m "feat: include rawDeviceToken in create device response"
```

---

### Task 8: Verify Endpoints + Manual Test

- [ ] **Step 1: Start dev server**

Run:
```bash
npm run start:dev
```
Expected: app starts without errors.

- [ ] **Step 2: Create a device via admin API**

```bash
curl -X POST http://localhost:3000/devices \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"address_id": 1, "name": "Test ESP32"}'
```
Expected response includes `deviceCode` and `rawDeviceToken`.

- [ ] **Step 3: Call status with device token**

```bash
curl http://localhost:3000/devices/code/DEV-X/status \
  -H "x-device-code: DEV-X" \
  -H "x-device-token: dtkn_xxxxxxx"
```
Expected: `{ "data": { "qrStatus": "WAITING" }, "message": "..." }`

- [ ] **Step 4: Verify wrong token rejected**

```bash
curl http://localhost:3000/devices/code/DEV-X/status \
  -H "x-device-code: DEV-X" \
  -H "x-device-token: wrong_token"
```
Expected: `401 Unauthorized`

- [ ] **Step 5: Rotate token via admin**

```bash
curl -X POST http://localhost:3000/devices/1/rotate-token \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
Expected: new `rawDeviceToken` returned. Old token should now fail.

- [ ] **Step 6: Revoke token via admin**

```bash
curl -X POST http://localhost:3000/devices/1/revoke-token \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
Expected: `200 OK`. All subsequent calls with that device's token should `401`.

- [ ] **Step 7: Run existing tests**

```bash
npm test
```
Expected: existing tests pass (update mocks if needed for changed `create()` return type).

- [ ] **Step 8: Commit any test fixes**

```bash
git add -A
git commit -m "test: update device tests for token auth changes"
```

---

## Summary: Request/Response Flow

```
ESP32                          Backend                    DB
  |                               |                        |
  |-- x-device-code + token ----->|                        |
  |                               |-- findUnique by code -->|
  |                               |<-- device record ------|
  |                               |                        |
  |                               |-- verifyDeviceToken -->|  (bcrypt compare)
  |                               |                        |
  |                               |-- getStatus by code --->|
  |                               |<-- qrStatus -----------|
  |                               |                        |
  |<--- { qrStatus: "WAITING" }--|                        |
```
