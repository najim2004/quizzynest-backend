export interface UserStats {
  totalPlayedQuizzes: number;
  totalEarnedCoin: number;
  highScore: number;
  totalCorrectAnswers: number;
  rankThisMonth: number;
  successRate: number;
}

export interface QuizHistoryResult {
  id: number;
  categoryName: string;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSpent: number;
  totalCoinsEarned: number;
  accuracy: number;
  completedAt: Date;
}
