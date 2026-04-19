/*
  Warnings:

  - You are about to drop the column `permission_id` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `permissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "permission_id",
DROP COLUMN "role_id",
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
