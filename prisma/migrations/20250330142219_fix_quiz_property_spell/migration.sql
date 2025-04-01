/*
  Warnings:

  - You are about to drop the column `maxPrice` on the `quizzes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quizzes" DROP COLUMN "maxPrice",
ADD COLUMN     "maxPrize" INTEGER NOT NULL DEFAULT 0;
