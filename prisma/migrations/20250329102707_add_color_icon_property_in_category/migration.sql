/*
  Warnings:

  - You are about to drop the column `questionId` on the `answers` table. All the data in the column will be lost.
  - You are about to drop the column `quizId` on the `quiz_results` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `quizzes` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `quizzes` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `user_question_answers` table. All the data in the column will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_completion_metrics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `quizId` to the `answers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTimeSpent` to the `quiz_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `quizzes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_quizId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_completion_metrics" DROP CONSTRAINT "quiz_completion_metrics_quizResultId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_results" DROP CONSTRAINT "quiz_results_quizId_fkey";

-- DropForeignKey
ALTER TABLE "user_question_answers" DROP CONSTRAINT "user_question_answers_questionId_fkey";

-- DropIndex
DROP INDEX "answers_questionId_idx";

-- DropIndex
DROP INDEX "quiz_results_userId_quizId_key";

-- DropIndex
DROP INDEX "quizzes_categoryId_createdBy_idx";

-- DropIndex
DROP INDEX "user_question_answers_userId_questionId_idx";

-- AlterTable
ALTER TABLE "answers" DROP COLUMN "questionId",
ADD COLUMN     "quizId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" TEXT DEFAULT '#FFFFFF',
ADD COLUMN     "icon" TEXT DEFAULT 'https://www.svgrepo.com/show/445599/category.svg';

-- AlterTable
ALTER TABLE "quiz_results" DROP COLUMN "quizId",
ADD COLUMN     "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCoinsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeSpent" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "quizzes" DROP COLUMN "isPublished",
DROP COLUMN "title",
ADD COLUMN     "maxPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "question" TEXT NOT NULL,
ADD COLUMN     "timeLimit" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "user_question_answers" DROP COLUMN "questionId",
ADD COLUMN     "quizResultId" INTEGER,
ADD COLUMN     "sessionId" INTEGER;

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "quiz_completion_metrics";

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "resultId" INTEGER,
    "selectedQuizIds" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_sessions_resultId_key" ON "quiz_sessions"("resultId");

-- CreateIndex
CREATE INDEX "quiz_sessions_userId_idx" ON "quiz_sessions"("userId");

-- CreateIndex
CREATE INDEX "quiz_sessions_startedAt_idx" ON "quiz_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "quiz_sessions_status_idx" ON "quiz_sessions"("status");

-- CreateIndex
CREATE INDEX "quiz_sessions_completedAt_idx" ON "quiz_sessions"("completedAt");

-- CreateIndex
CREATE INDEX "quiz_sessions_userId_status_idx" ON "quiz_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "quiz_sessions_userId_startedAt_idx" ON "quiz_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "achievements_userId_idx" ON "achievements"("userId");

-- CreateIndex
CREATE INDEX "achievements_type_idx" ON "achievements"("type");

-- CreateIndex
CREATE INDEX "achievements_earnedAt_idx" ON "achievements"("earnedAt");

-- CreateIndex
CREATE INDEX "achievements_userId_earnedAt_idx" ON "achievements"("userId", "earnedAt");

-- CreateIndex
CREATE INDEX "answers_quizId_idx" ON "answers"("quizId");

-- CreateIndex
CREATE INDEX "answers_quizId_isCorrect_idx" ON "answers"("quizId", "isCorrect");

-- CreateIndex
CREATE INDEX "categories_createdBy_idx" ON "categories"("createdBy");

-- CreateIndex
CREATE INDEX "categories_createdAt_idx" ON "categories"("createdAt");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "question_attempt_metrics_createdAt_idx" ON "question_attempt_metrics"("createdAt");

-- CreateIndex
CREATE INDEX "question_attempt_metrics_isCorrect_idx" ON "question_attempt_metrics"("isCorrect");

-- CreateIndex
CREATE INDEX "question_attempt_metrics_userAnswerId_idx" ON "question_attempt_metrics"("userAnswerId");

-- CreateIndex
CREATE INDEX "quiz_results_completedAt_idx" ON "quiz_results"("completedAt");

-- CreateIndex
CREATE INDEX "quiz_results_userId_completedAt_idx" ON "quiz_results"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "quiz_results_accuracy_idx" ON "quiz_results"("accuracy");

-- CreateIndex
CREATE INDEX "quizzes_categoryId_idx" ON "quizzes"("categoryId");

-- CreateIndex
CREATE INDEX "quizzes_createdBy_idx" ON "quizzes"("createdBy");

-- CreateIndex
CREATE INDEX "quizzes_difficulty_idx" ON "quizzes"("difficulty");

-- CreateIndex
CREATE INDEX "quizzes_createdAt_idx" ON "quizzes"("createdAt");

-- CreateIndex
CREATE INDEX "quizzes_categoryId_difficulty_idx" ON "quizzes"("categoryId", "difficulty");

-- CreateIndex
CREATE INDEX "quizzes_categoryId_createdBy_createdAt_idx" ON "quizzes"("categoryId", "createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "user_profiles_userId_idx" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_question_answers_userId_idx" ON "user_question_answers"("userId");

-- CreateIndex
CREATE INDEX "user_question_answers_sessionId_idx" ON "user_question_answers"("sessionId");

-- CreateIndex
CREATE INDEX "user_question_answers_answeredAt_idx" ON "user_question_answers"("answeredAt");

-- CreateIndex
CREATE INDEX "user_question_answers_quizResultId_idx" ON "user_question_answers"("quizResultId");

-- CreateIndex
CREATE INDEX "user_question_answers_userId_quizId_idx" ON "user_question_answers"("userId", "quizId");

-- CreateIndex
CREATE INDEX "user_question_answers_userId_sessionId_idx" ON "user_question_answers"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "user_question_answers_userId_quizId_sessionId_answeredAt_idx" ON "user_question_answers"("userId", "quizId", "sessionId", "answeredAt");

-- CreateIndex
CREATE INDEX "user_vouchers_userId_idx" ON "user_vouchers"("userId");

-- CreateIndex
CREATE INDEX "user_vouchers_voucherId_idx" ON "user_vouchers"("voucherId");

-- CreateIndex
CREATE INDEX "user_vouchers_status_idx" ON "user_vouchers"("status");

-- CreateIndex
CREATE INDEX "user_vouchers_userId_voucherId_idx" ON "user_vouchers"("userId", "voucherId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "vouchers_code_idx" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_price_idx" ON "vouchers"("price");

-- CreateIndex
CREATE INDEX "vouchers_createdAt_idx" ON "vouchers"("createdAt");

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_quizResultId_fkey" FOREIGN KEY ("quizResultId") REFERENCES "quiz_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "quiz_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
