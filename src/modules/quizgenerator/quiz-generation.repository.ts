import { PrismaClient } from '@prisma/client';
import { GeneratedQuiz, QuizQuestion } from '../models/quiz.model';

export class QuizGenerationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Save a generated quiz to the database
   */
  async saveGeneratedQuiz(quizData: GeneratedQuiz): Promise<GeneratedQuiz> {
    try {
      // Create quiz
      const quiz = await this.prisma.quiz.create({
        data: {
          title: quizData.title,
          description: quizData.description,
          isPublic: quizData.isPublic || false,
          userId: quizData.userId,
          categoryId: quizData.categoryId,
          sourceFiles: quizData.sourceFiles || [],
        },
      });

      // Create questions for the quiz
      const questions = await Promise.all(
        quizData.questions.map(async (question) => {
          return this.prisma.question.create({
            data: {
              question: question.question,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              quizId: quiz.id,
            },
          });
        })
      );

      // Return the combined quiz object with questions
      return {
        ...quiz,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          quizId: q.quizId,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        })),
      };
    } catch (error) {
      console.error('Error saving generated quiz:', error);
      throw new Error(`Database operation failed: ${(error as Error).message}`);
    }
  }
}

export const quizGenerationRepository = new QuizGenerationRepository();