import { Category } from "@prisma/client";

export interface UserStats {
  totalPlayedQuizzes: number;
  totalEarnedCoin: number;
  totalCorrectAnswers: number;
  highScore: number;
  successRate: number;
  rankThisMonth: number;
  categoryScores: { categoryId: number; categoryName: string; accuracy: number }[]; // নতুন প্রপার্টি

}

export interface QuizHistoryResult {
  id: number;
  category: Pick<Category, "icon" | "name" | "color" | "id">;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSpent: number;
  totalCoinsEarned: number;
  accuracy: number;
  completedAt: Date;
}
