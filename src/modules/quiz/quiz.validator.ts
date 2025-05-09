import { CreateQuizDto, UpdateQuizDto } from "./quiz.type";

export const validateCreateQuiz = (data: CreateQuizDto): string | null => {
  if (!data.question?.trim()) {
    return "Question is required";
  }
  if (!data.answers?.length || data.answers.length < 2) {
    return "At least 2 answers are required";
  }
  if (!data.answers.some((answer) => answer.isCorrect)) {
    return "At least one correct answer is required";
  }
  if (!data.timeLimit) {
    return "Time limit is required";
  }
  if (!data.categoryId) {
    return "Category is required";
  }
  return null;
};

export const validateUpdateQuiz = (data: UpdateQuizDto): string | null => {
  if (data.question !== undefined && !data.question.trim()) {
    return "Question cannot be empty";
  }
  if (data.answers !== undefined) {
    if (data.answers.length < 2) {
      return "At least 2 answers are required";
    }
    if (!data.answers.some((answer) => answer.isCorrect)) {
      return "At least one correct answer is required";
    }
  }
  return null;
};
