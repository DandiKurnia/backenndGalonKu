# Refresh Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure refresh token system with rotation and reuse detection using PostgreSQL and Prisma.

**Architecture:** A database-backed refresh token storage using SHA-256 hashing. It implements "Refresh Token Rotation" where every refresh issues a new pair and revokes the old one. If a revoked token is reused, all active tokens for that user are invalidated as a security measure.

**Tech Stack:** NestJS, Prisma, PostgreSQL, JWT (Passport), Bcrypt, Zod.

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Define the RefreshToken model and User relation**

Add the following to `prisma/schema.prisma`:

```prisma
// Update User model to include refreshTokens relation
model User {
  // ... existing fields ...
  refreshTokens RefreshToken[]
}

// Add RefreshToken model
model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique          // SHA-256 hash
  userId    Int      @map("user_id")
  expiresAt DateTime @map("expires_at")
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}
```

- [ ] **Step 2: Run Prisma migration**

Run: `npx prisma migrate dev --name add_refresh_token_table`
Expected: Database schema updated, migration file created.

- [ ] **Step 3: Commit changes**

```bash
git add prisma/schema.prisma
git commit -m "db: add RefreshToken model"
```

---

### Task 2: DTOs and Response Updates

**Files:**
- Create: `src/auth/dto/auth-refresh.dto.ts`
- Create: `src/auth/dto/auth-logout.dto.ts`
- Modify: `src/auth/response/auth-login.response.ts`

- [ ] **Step 1: Create AuthRefreshDto**

```typescript
import z, { ZodObject } from 'zod';

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthRefreshDto {
  static schema: ZodObject<any> = authRefreshSchema;
  constructor(public readonly refreshToken: string) {}
}
```

- [ ] **Step 2: Create AuthLogoutDto**

```typescript
import z, { ZodObject } from 'zod';

export const authLogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthLogoutDto {
  static schema: ZodObject<any> = authLogoutSchema;
  constructor(public readonly refreshToken: string) {}
}
```

- [ ] **Step 3: Update AuthLoginResponse**

Modify `src/auth/response/auth-login.response.ts`:
```typescript
export class AuthLoginResponse {
  @Expose()
  accessToken?: string;

  @Expose()
  refreshToken?: string; // Added this

  @Expose()
  @Type(() => UserResponse)
  user?: UserResponse;
}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/auth/dto/auth-refresh.dto.ts src/auth/dto/auth-logout.dto.ts src/auth/response/auth-login.response.ts
git commit -m "feat: add refresh and logout DTOs and update response"
```

---

### Task 3: AuthService - Token Utilities

**Files:**
- Modify: `src/auth/auth.service.ts`

- [ ] **Step 1: Add crypto import and update expiry constants**

In `src/auth/auth.service.ts`:
```typescript
import * as crypto from 'crypto';
// ...
```

- [ ] **Step 2: Add hashing and generation helpers**

Add these private methods to `AuthService` class:
```typescript
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRandomToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }
```

- [ ] **Step 3: Implement generateTokenPair**

```typescript
  private async generateTokenPair(user: JwtUser): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateToken(user);
    const rawRefreshToken = this.generateRandomToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    
    // Default 7 days
    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
```

- [ ] **Step 4: Update buildAuthResponse to use generateTokenPair**

Modify `buildAuthResponse(user: userWithRole)`:
```typescript
  private async buildAuthResponse(user: userWithRole): Promise<AuthLoginResponse> {
    const { accessToken, refreshToken } = await this.generateTokenPair(user);
    const userResponse = this.transformUser(user);

    const authResponse: AuthLoginResponse = {
      accessToken,
      refreshToken,
      user: userResponse,
    };

    return authResponse;
  }
```
*Note: This makes `buildAuthResponse`, `login`, and `register` async.*

- [ ] **Step 5: Commit changes**

```bash
git add src/auth/auth.service.ts
git commit -m "feat: implement token pair generation and hashing"
```

---

### Task 4: AuthService - Refresh & Logout Logic

**Files:**
- Modify: `src/auth/auth.service.ts`

- [ ] **Step 1: Implement refreshTokens with rotation and reuse detection**

Add to `AuthService`:
```typescript
  async refreshTokens(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.hashToken(rawToken);
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
      include: { user: true },
    });

    if (!token) throw new UnauthorizedException('Invalid refresh token');
    
    if (token.revoked) {
      // REUSE DETECTION: Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: token.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
    }

    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke current token
    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revoked: true },
    });

    // Issue new pair
    return this.generateTokenPair({
      id: token.user.id,
      email: token.user.email,
      name: token.user.name,
      roleId: token.user.roleId,
    });
  }
```

- [ ] **Step 2: Implement logout**

Add to `AuthService`:
```typescript
  async logout(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    await this.prisma.refreshToken.update({
      where: { token: hash },
      data: { revoked: true },
    }).catch(() => { /* ignore if not found */ });
  }
```

- [ ] **Step 3: Commit changes**

```bash
git add src/auth/auth.service.ts
git commit -m "feat: implement refresh logic with rotation and logout"
```

---

### Task 5: AuthController - Endpoints

**Files:**
- Modify: `src/auth/auth.controller.ts`

- [ ] **Step 1: Add refresh and logout endpoints**

Modify `src/auth/auth.controller.ts`:
```typescript
  @Post('refresh')
  async refresh(@Body() request: AuthRefreshDto) {
    return await this.authService.refreshTokens(request.refreshToken);
  }

  @Post('logout')
  async logout(@Body() request: AuthLogoutDto) {
    await this.authService.logout(request.refreshToken);
    return { message: 'Logged out successfully' };
  }
```

- [ ] **Step 2: Commit changes**

```bash
git add src/auth/auth.controller.ts
git commit -m "feat: add refresh and logout endpoints to AuthController"
```

---

### Task 6: Env Configuration

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example with refresh token settings**

Add to `.env.example`:
```
REFRESH_TOKEN_EXPIRES_IN=7
```

- [ ] **Step 2: Commit changes**

```bash
git add .env.example
git commit -m "config: add refresh token expiry env var"
```
