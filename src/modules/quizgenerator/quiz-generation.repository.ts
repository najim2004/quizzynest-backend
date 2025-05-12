// src/repositories/quiz-generation.repository.ts

import { Category, PrismaClient } from "@prisma/client";
import { CreateQuizDto } from "../quiz/quiz.type";

export class QuizGenerationRepository {
  private prisma: PrismaClient;
  private readonly BATCH_SIZE = 100; // Batch size control

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Creates multiple quizzes with their corresponding answers in batches.
   * @param quizzesData Array of quiz data with answers and createdBy
   * @param userId ID of the user creating the quizzes (optional future use)
   */
  async createQuizzesWithAnswers(
    quizzesData: CreateQuizDto[],
    userId: number
  ): Promise<void> {
    try {
      for (let i = 0; i < quizzesData.length; i += this.BATCH_SIZE) {
        const batch = quizzesData.slice(i, i + this.BATCH_SIZE);

        await this.prisma.$transaction(
          batch.map((quiz) =>
            this.prisma.quiz.create({
              data: {
                ...quiz,
                categoryId: +quiz.categoryId,
                createdBy: userId, // Assuming userId is the creator of the quiz
                // Add other quiz fields here if any
                answers: {
                  create: quiz.answers.map((answer) => ({
                    ...answer,
                  })),
                },
              },
            })
          )
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(
        `❌ Failed to create quizzes with answers: ${errorMessage}`
      );
    }
  }
  async getCategories(): Promise<Pick<Category, "id" | "name">[]> {
    try {
      const categories = await this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      return categories;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`❌ Failed to fetch categories: ${errorMessage}`);
    }
  }
}

export const quizGenerationRepository = new QuizGenerationRepository();
