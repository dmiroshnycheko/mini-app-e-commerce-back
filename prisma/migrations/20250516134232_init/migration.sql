/*
  Warnings:

  - You are about to drop the column `fileContent` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "fileContent",
ADD COLUMN     "textContent" TEXT[] DEFAULT ARRAY[]::TEXT[];
