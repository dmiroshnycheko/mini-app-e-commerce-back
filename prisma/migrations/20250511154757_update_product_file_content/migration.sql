/*
  Warnings:

  - You are about to drop the column `filePath` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "filePath",
ADD COLUMN     "fileContent" TEXT NOT NULL DEFAULT '';
