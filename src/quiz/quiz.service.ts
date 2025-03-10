import { PrismaClient, Quiz, QuizResult } from "@prisma/client";
import {
  CreateQuizDto,
  UpdateQuizDto,
  QuizFilterDto,
  AdminQuizFilterDto,
  QuizAnswerResponse,
  MetricsData,
} from "./quiz.type";

export class QuizService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new quiz with answers
   */
  async createQuiz(
    userId: number,
    createQuizDto: CreateQuizDto
  ): Promise<Quiz> {
    const { answers, categoryId, ...quizData } = createQuizDto;

    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Validate at least one correct answer
    const hasCorrectAnswer = answers.some((answer) => answer.isCorrect);
    if (!hasCorrectAnswer) {
      throw new Error("Quiz must have at least one correct answer");
    }

    // Create quiz with answers in a transaction
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          ...quizData,
          categoryId,
          createdBy: userId,
          answers: {
            create: answers,
          },
        },
        include: {
          answers: true,
          category: true,
        },
      });
      return quiz;
    });
  }

  /**
   * Get quiz by ID with answers
   */
  async getQuizById(id: number): Promise<Quiz> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        answers: true,
        category: true,
      },
    });

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    return quiz;
  }

  /**
   * Get filtered quizzes with pagination
   */
  async getQuizzes(userId: number, filters: QuizFilterDto) {
    return this.prisma.$transaction(async (tx) => {
      // Start a new session
      const session = await tx.quizSession.create({
        data: {
          userId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          selectedQuizIds: "[]",
        },
      });

      if (!session) {
        throw new Error("Failed to start quiz session");
      }

      const { limit = 10, difficulty, categoryId } = filters;
      const where = {
        ...(difficulty && { difficulty }),
        ...(categoryId && { categoryId }),
      };

      const total = await tx.quiz.count({ where });
      let quizzes: Quiz[];

      if (total <= limit) {
        quizzes = await tx.quiz.findMany({
          where,
          include: { category: true, answers: true },
          orderBy: { id: "asc" },
        });

        for (let i = quizzes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [quizzes[i], quizzes[j]] = [quizzes[j], quizzes[i]];
        }
      } else {
        quizzes = await tx.$queryRaw`
      SELECT q.*, c.*, a.*
      FROM "Quiz" q
      LEFT JOIN "Category" c ON q."categoryId" = c.id
      LEFT JOIN "Answer" a ON q.id = a."quizId"
      WHERE ${this.buildWhereClause(where)}
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;
      }
      if (quizzes.length === 0) {
        throw new Error("No quizzes available after query execution"); // Abort transaction
      }
      // Update session with selected quiz IDs
      await tx.quizSession.update({
        where: { id: session.id },
        data: {
          selectedQuizIds: JSON.stringify(quizzes.map((q) => q.id)),
        },
      });

      return {
        sessionId: session.id,
        data: quizzes,
        meta: {
          total,
          limit,
        },
      };
    });
  }

  // where ক্লজ তৈরির হেল্পার ফাংশন
  private buildWhereClause(where: any) {
    const conditions = [];
    if (where.difficulty)
      conditions.push(`q.difficulty = '${where.difficulty}'`);
    if (where.categoryId)
      conditions.push(`q."categoryId" = ${where.categoryId}`);
    return conditions.length > 0 ? conditions.join(" AND ") : "1=1";
  }

  /**
   * Get filtered quizzes with pagination for admin
   */
  async getQuizzesForAdmin(filters: AdminQuizFilterDto) {
    try {
      const {
        page = 1,
        limit = 10,
        difficulty,
        categoryId,
        search,
        createdBy,
      } = filters;

      const where = {
        ...(difficulty && { difficulty }),
        ...(categoryId && { categoryId }),
        ...(createdBy && { createdBy }),
        ...(search && {
          OR: [
            {
              question: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [quizzes, total] = await Promise.all([
        this.prisma.quiz.findMany({
          where,
          include: {
            category: true,
            answers: true,
            creator: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.quiz.count({ where }),
      ]);

      return {
        data: quizzes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("[Quiz Service] Get admin quizzes error:", error);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
  }

  /**
   * Update quiz and its answers
   */
  async updateQuiz(
    id: number,
    userId: number,
    updateQuizDto: UpdateQuizDto
  ): Promise<Quiz> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { answers: true },
    });

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    if (quiz.createdBy !== userId) {
      throw new Error("Not authorized to update this quiz");
    }

    const { answers, ...quizData } = updateQuizDto;

    return this.prisma.$transaction(async (tx) => {
      // Delete existing answers if new answers provided
      if (answers) {
        await tx.answer.deleteMany({
          where: { quizId: id },
        });
      }

      return tx.quiz.update({
        where: { id },
        data: {
          ...quizData,
          ...(answers && {
            answers: {
              create: answers,
            },
          }),
        },
        include: {
          answers: true,
          category: true,
        },
      });
    });
  }

  /**
   * Delete quiz and associated answers
   */
  async deleteQuiz(id: number, userId: number): Promise<boolean> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    if (quiz.createdBy !== userId) {
      throw new Error("Not authorized to delete this quiz");
    }

    const answers = await this.prisma.quiz.delete({
      where: { id },
    });

    return !!answers;
  }

  /**
   * Submit quiz answer and calculate results
   */
  async submitQuizAnswer(
    userId: number,
    sessionId: number,
    quizId: number,
    answerId: number
  ): Promise<QuizAnswerResponse | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.quizSession.findFirst({
          where: {
            id: sessionId,
            userId,
            status: "IN_PROGRESS",
          },
        });

        if (!session) return null;

        const selectedQuizIds = JSON.parse(session.selectedQuizIds as string);
        if (!selectedQuizIds.includes(quizId)) return null;

        const [quiz, existingAnswer] = await Promise.all([
          tx.quiz.findUnique({
            where: { id: quizId },
            include: { answers: true },
          }),
          tx.userQuestionAnswer.findFirst({
            where: { userId, quizId },
          }),
        ]);

        if (!quiz || existingAnswer) return null;

        const selectedAnswer = quiz.answers.find((a) => a.id === answerId);
        if (!selectedAnswer) return null;

        const userAnswer = await tx.userQuestionAnswer.create({
          data: {
            userId,
            quizId,
            selectedAnswerId: answerId,
            sessionId,
          },
        });

        const metrics: MetricsData = {
          isCorrect: selectedAnswer.isCorrect,
          timeTaken: 0, // Will be calculated from client
          coinsEarned: selectedAnswer.isCorrect ? quiz.maxPrice : 0,
        };

        await Promise.all([
          tx.questionAttemptMetrics.create({
            data: {
              userAnswerId: userAnswer.id,
              ...metrics,
            },
          }),
          tx.quizSession.update({
            where: { id: sessionId },
            data: { answeredCount: { increment: 1 } },
          }),
        ]);

        return {
          correct: selectedAnswer.isCorrect,
          earnedCoins: metrics.coinsEarned,
          timeTaken: metrics.timeTaken,
        };
      });
    } catch (error) {
      console.error("[Quiz Service] Submit answer error:", error);
      return null;
    }
  }

  async createQuizResult(
    userId: number,
    sessionId: number
  ): Promise<QuizResult | null> {
    try {
      if (!userId || !sessionId) return null;
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.quizSession.findFirst({
          where: {
            id: sessionId,
            userId,
            status: "IN_PROGRESS",
          },
          include: {
            questionAnswers: {
              include: { metrics: true },
            },
          },
        });

        if (!session) return null;

        const { questionAnswers, totalQuestions } = session;
        const metrics = questionAnswers.reduce(
          (acc, answer) => ({
            correctAnswers:
              acc.correctAnswers + (answer.metrics?.isCorrect ? 1 : 0),
            totalTimeSpent:
              acc.totalTimeSpent + (answer.metrics?.timeTaken ?? 0),
            totalCoinsEarned:
              acc.totalCoinsEarned + (answer.metrics?.coinsEarned ?? 0),
          }),
          { correctAnswers: 0, totalTimeSpent: 0, totalCoinsEarned: 0 }
        );

        const accuracy =
          totalQuestions > 0
            ? (metrics.correctAnswers / totalQuestions) * 100
            : 0;

        const [quizResult] = await Promise.all([
          tx.quizResult.create({
            data: {
              userId,
              ...metrics,
              accuracy,
              totalQuestions,
              questionResults: {
                connect: questionAnswers.map((qa) => ({ id: qa.id })),
              },
            },
            include: {
              questionResults: {
                include: {
                  quiz: true,
                  selectedAnswer: true,
                  metrics: true,
                },
              },
            },
          }),
          tx.quizSession.update({
            where: { id: sessionId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          }),
        ]);

        return quizResult;
      });
    } catch (error) {
      console.error("[Quiz Service] Create result error:", error);
      return null;
    }
  }
}
