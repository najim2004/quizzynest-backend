-- DropIndex
DROP INDEX "quizzes_categoryId_createdBy_createdAt_idx";

-- DropIndex
DROP INDEX "quizzes_categoryId_difficulty_idx";

-- DropIndex
DROP INDEX "user_vouchers_userId_status_idx";

-- DropIndex
DROP INDEX "user_vouchers_userId_voucherId_idx";

-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quizGenerationSessionId" INTEGER;

-- AlterTable
ALTER TABLE "user_vouchers" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "quiz_generation_sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "statusMessage" TEXT,
    "quizzes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_generation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_generation_sessions_userId_idx" ON "quiz_generation_sessions"("userId");

-- CreateIndex
CREATE INDEX "quiz_generation_sessions_createdAt_idx" ON "quiz_generation_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "quiz_generation_sessions_updatedAt_idx" ON "quiz_generation_sessions"("updatedAt");

-- CreateIndex
CREATE INDEX "answers_isDeleted_idx" ON "answers"("isDeleted");

-- CreateIndex
CREATE INDEX "categories_isDeleted_idx" ON "categories"("isDeleted");

-- CreateIndex
CREATE INDEX "quizzes_isDeleted_idx" ON "quizzes"("isDeleted");

-- CreateIndex
CREATE INDEX "user_vouchers_isDeleted_idx" ON "user_vouchers"("isDeleted");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_quizGenerationSessionId_fkey" FOREIGN KEY ("quizGenerationSessionId") REFERENCES "quiz_generation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_generation_sessions" ADD CONSTRAINT "quiz_generation_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
