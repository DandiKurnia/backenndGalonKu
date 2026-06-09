/*
  Warnings:

  - You are about to drop the column `status` on the `devices` table. All the data in the column will be lost.
  - Made the column `qr_status` on table `devices` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "devices" DROP COLUMN "status",
ALTER COLUMN "qr_status" SET NOT NULL;
