# Refresh Token Implementation — Design Spec

**Date:** 2026-06-01
**Status:** Draft
**Scope:** Add refresh token with rotation strategy to existing NestJS auth module

---

## Current State

The app issues a single JWT access token on login/register (`auth.service.ts:53-65`). No refresh token exists. When the token expires, the user must re-authenticate.

**Relevant files:**
- `src/auth/auth.service.ts` — token generation, login, register
- `src/auth/auth.controller.ts` — `POST /auth/login`, `POST /auth/register`
- `src/auth/response/auth-login.response.ts` — response DTOs
- `src/auth/strategies/jwt.srategy.ts` — Passport JWT strategy
- `src/auth/auth.module.ts` — module config
- `prisma/schema.prisma` — database schema (User, Role, etc.)
- `src/common/prisma/prisma.service.ts` — Prisma client
- `src/common/strategies/acces-token.strategy.ts` — access token strategy

---

## Design Decisions

### Storage: PostgreSQL via Prisma

Refresh tokens stored in a `refresh_tokens` table in the existing PostgreSQL database.

**Rationale:**
- No additional infrastructure (no Redis dependency).
- Easy to query, revoke, and audit.
- Integrated with existing Prisma setup.
- Query overhead is negligible for auth operations.

### Strategy: Refresh Token Rotation

Each time a refresh token is used:
1. Validate the token against DB (exists, not revoked, not expired).
2. Revoke the old token.
3. Issue a new access token + new refresh token.
4. If a revoked token is reused (reuse detection): revoke ALL tokens for that user (security measure — indicates token theft).

### Token Lifetimes

| Token | Default | Env Var |
|-------|---------|---------|
| Access Token | 15 minutes | `JWT_EXPIRES_IN` |
| Refresh Token | 7 days | `REFRESH_TOKEN_EXPIRES_IN` |

### Hashing

Refresh tokens are hashed (SHA-256) before storage. Only the hash is stored in DB — the raw token is sent to the client only once.

---

## Database Schema

### New Model: `RefreshToken`

```prisma
model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique          // SHA-256 hash of the raw token
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

### User Model Update

```prisma
model User {
  // ... existing fields ...
  refreshTokens RefreshToken[]   // ← add this relation
  // ...
}
```

---

## API Endpoints

### `POST /auth/login` (existing — modified response)

**Request:** unchanged
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response:** add `refreshToken`
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "user": { ... }
}
```

### `POST /auth/register` (existing — modified response)

Same response change as login — now returns `refreshToken` alongside `accessToken`.

### `POST /auth/refresh` (new)

**Request:**
```json
{ "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..." }
```

**Response:**
```json
{
  "accessToken": "eyJhbG...(new)",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...(new)"
}
```

**Error cases:**
- Token not found in DB → `401 Unauthorized`
- Token revoked (reuse detected) → revoke ALL user tokens → `401 Unauthorized`
- Token expired → `401 Unauthorized`

### `POST /auth/logout` (new)

**Request:**
```json
{ "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..." }
```

**Response:** `200 OK`
```json
{ "message": "Logged out successfully" }
```

---

## Service Methods

### `auth.service.ts` — new/modified methods

```typescript
// Generate access + refresh token pair
async generateTokenPair(user: JwtUser): Promise<{ accessToken: string; refreshToken: string }>

// Hash a raw token for DB lookup
private hashToken(token: string): string

// Generate a random refresh token string
private generateRefreshToken(): string

// Validate refresh token: exists, not revoked, not expired
private validateRefreshToken(rawToken: string): Promise<RefreshToken>

// Revoke a specific refresh token
private revokeRefreshToken(tokenHash: string): Promise<void>

// Revoke ALL refresh tokens for a user (reuse detection)
private revokeAllUserTokens(userId: number): Promise<void>

// Main refresh flow: validate → revoke old → issue new pair
async refreshTokens(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }>

// Logout: revoke the given refresh token
async logout(rawRefreshToken: string): Promise<void>
```

### Modified: `buildAuthResponse()`

Currently returns `{ accessToken, user }`. Change to return `{ accessToken, refreshToken, user }`.

### Modified: `generateToken()`

Change access token expiry from `process.env.JWT_EXPIRES_IN ?? '1h'` to `process.env.JWT_EXPIRES_IN ?? '15m'`.

---

## DTOs

### New: `auth-refresh.dto.ts`

```typescript
export class AuthRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### New: `auth-logout.dto.ts`

```typescript
export class AuthLogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### Modified: `auth-login.response.ts`

```typescript
export class AuthLoginResponse {
  @Expose()
  accessToken?: string;

  @Expose()
  refreshToken?: string;   // ← add

  @Expose()
  @Type(() => UserResponse)
  user?: UserResponse;
}
```

---

## Flow Diagrams

### Login / Register
```
Client → POST /auth/login
  → validate credentials
  → generate accessToken (15m)
  → generate random refreshToken
  → hash refreshToken → store in DB
  → return { accessToken, refreshToken, user }
Client stores both tokens (e.g. localStorage / secure cookie)
```

### Refresh
```
Client → POST /auth/refresh { refreshToken }
  → hash the raw token
  → lookup in DB by hash
  → if not found → 401
  → if revoked → reuse detected! revoke ALL user tokens → 401
  → if expired → 401
  → revoke old token in DB
  → generate new accessToken + refreshToken
  → store new hashed refreshToken in DB
  → return { accessToken, refreshToken }
```

### Logout
```
Client → POST /auth/logout { refreshToken }
  → hash the raw token
  → lookup in DB by hash
  → revoke that token
  → return 200
```

---

## Security Considerations

1. **Token hashing:** Only SHA-256 hashes stored in DB. Raw tokens never persisted.
2. **Reuse detection:** If a revoked token is presented, ALL user tokens are revoked — this mitigates token theft.
3. **Cascade delete:** When a user is deleted, all their refresh tokens are cascade-deleted.
4. **Short access token lifetime:** 15 minutes limits exposure if access token leaks.
5. **Environment variables:** `JWT_SECRET_KEY` and `REFRESH_TOKEN_EXPIRES_IN` configurable via `.env`.

---

## Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `RefreshToken` model + `User` relation |
| `src/auth/auth.service.ts` | Modify | Add refresh token logic, update `buildAuthResponse` |
| `src/auth/auth.controller.ts` | Modify | Add `POST /auth/refresh`, `POST /auth/logout` |
| `src/auth/response/auth-login.response.ts` | Modify | Add `refreshToken` field |
| `src/auth/dto/auth-refresh.dto.ts` | Create | Refresh token DTO |
| `src/auth/dto/auth-logout.dto.ts` | Create | Logout DTO |
| `src/auth/auth.module.ts` | Modify | Register new providers if needed |
| `.env` / `.env.example` | Modify | Add `REFRESH_TOKEN_EXPIRES_IN` |
