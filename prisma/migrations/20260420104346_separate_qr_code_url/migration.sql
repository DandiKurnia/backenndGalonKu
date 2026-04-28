-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "qr_code_url" TEXT,
ALTER COLUMN "last_active" SET DEFAULT CURRENT_TIMESTAMP;
