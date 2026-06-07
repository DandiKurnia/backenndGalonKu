-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "device_token_hash" TEXT,
ADD COLUMN     "token_issued_at" TIMESTAMP(3),
ADD COLUMN     "token_revoked_at" TIMESTAMP(3);
