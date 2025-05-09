import { Category } from "@prisma/client";

export type CreateCategoryInput = {
  name: string;
  description?: string;
  color?: string;
  icon?: string | null;
  iconId?: string | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
export type CategoryWithQuizCount = Category & {
  _count: {
    quizzes: number;
  };
};
