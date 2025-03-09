/*
  Warnings:

  - You are about to drop the column `metrics` on the `quiz_results` table. All the data in the column will be lost.
  - You are about to drop the column `metrics` on the `user_question_answers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quiz_results" DROP COLUMN "metrics";

-- AlterTable
ALTER TABLE "user_question_answers" DROP COLUMN "metrics";

-- CreateTable
CREATE TABLE "question_attempt_metrics" (
    "id" SERIAL NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempt_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_completion_metrics" (
    "id" SERIAL NOT NULL,
    "quizResultId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalCoins" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_completion_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_attempt_metrics_userAnswerId_key" ON "question_attempt_metrics"("userAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_completion_metrics_quizResultId_key" ON "quiz_completion_metrics"("quizResultId");

-- AddForeignKey
ALTER TABLE "question_attempt_metrics" ADD CONSTRAINT "question_attempt_metrics_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "user_question_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_completion_metrics" ADD CONSTRAINT "quiz_completion_metrics_quizResultId_fkey" FOREIGN KEY ("quizResultId") REFERENCES "quiz_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
