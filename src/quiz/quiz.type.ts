import { Difficulty, Quiz } from "@prisma/client";

export interface CreateQuizDto {
  question: string;
  timeLimit?: number;
  maxPrize?: number;
  description?: string;
  difficulty: Difficulty;
  categoryId: number;
  answers: {
    label: "A" | "B" | "C" | "D";
    text: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateQuizDto extends Partial<CreateQuizDto> {}

export interface QuizFilterDto {
  limit?: number;
  difficulty?: Difficulty;
  categoryId?: number;
}

export interface AdminQuizFilterDto extends QuizFilterDto {
  page?: number;
  search?: string;
  createdBy?: number;
}

export interface QuizSessionResponse {
  data: Quiz[];
  meta: {
    total: number;
    limit: number;
    sessionId: number;
  };
}

export interface QuizAnswerResponse {
  correct: boolean;
  earnedCoins: number;
  timeTaken: number;
}

export interface MetricsData {
  isCorrect: boolean;
  timeTaken: number;
  coinsEarned: number;
}
