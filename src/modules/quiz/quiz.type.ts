import { Difficulty, Quiz, QuizStatus } from "@prisma/client";

export interface CreateQuizDto {
  question: string;
  timeLimit?: number;
  maxPrize?: number;
  description?: string;
  difficulty: Difficulty;
  categoryId: number;
  answers: { label: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }[];
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
  status?: QuizStatus;
}

export interface ClientQuiz
  extends Omit<
    Pick<
      Quiz,
      | "id"
      | "question"
      | "timeLimit"
      | "maxPrize"
      | "difficulty"
      | "categoryId"
      | "description"
    >,
    "answers"
  > {
  answers: { id: number; label: "A" | "B" | "C" | "D"; text: string }[];
  currentQuizIndex: number;
  startTime: string;
}

export interface QuizSessionResponse {
  sessionId: number;
  currentQuiz: ClientQuiz;
  totalQuizzes: number;
}

export interface QuizAnswerResponse {
  correct: boolean;
  earnedCoins: number;
  timeTaken: number;
}

export interface SubmitQuizAnswerResponse {
  answerResponse: QuizAnswerResponse;
  nextQuiz: ClientQuiz | null;
  result?: QuizResult;
}

export interface QuizResult {
  id: number;
  userId: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSpent: number;
  totalCoinsEarned: number;
  accuracy: number;
  completedAt: string;
}
export interface MetricsData {
  isCorrect: boolean;
  timeTaken: number;
  coinsEarned: number;
}
