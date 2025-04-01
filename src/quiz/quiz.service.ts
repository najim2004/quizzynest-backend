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

  async startQuizSession(userId: number, filters: QuizFilterDto) {
    return this.prisma.$transaction(async (tx) => {
      const { limit = 10, difficulty, categoryId } = filters;
      const where = {
        ...(difficulty && { difficulty }),
        ...(categoryId && { categoryId }),
      };

      const selectedQuizIds = await tx.$queryRaw<{ id: number }[]>`
        SELECT id
        FROM "quizzes"
        WHERE ${this.buildWhereClause(where)}
        ORDER BY RANDOM()
        LIMIT ${limit}
      `;

      if (selectedQuizIds.length === 0) {
        throw new Error("No quizzes available after random selection");
      }

      const quizIds = selectedQuizIds.map((q) => q.id);

      const session = await tx.quizSession.create({
        data: {
          userId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          selectedQuizIds: JSON.stringify(quizIds),
          totalQuestions: quizIds.length,
        },
      });

      const firstQuizId = quizIds[0];
      const firstQuiz = await tx.quiz.findUnique({
        where: { id: firstQuizId },
        include: { category: true, answers: true },
      });

      if (!firstQuiz) {
        throw new Error("Failed to fetch first quiz");
      }

      const nextQuizId = quizIds.length > 1 ? quizIds[1] : null;

      const currentQuizWithDetails = {
        ...firstQuiz,
        currentQuizIndex: 0,
        nextQuizId,
        previousQuizId: null,
      };

      return {
        sessionId: session.id,
        currentQuiz: currentQuizWithDetails,
        totalQuizzes: quizIds.length,
      };
    });
  }

  async getNextQuiz(
    userId: number,
    sessionId: number,
    currentQuizId: number
  ): Promise<{
    currentQuiz:
      | (Quiz & {
          currentQuizIndex: number;
          previousQuizId: number | null;
          nextQuizId: number | null;
        })
      | null;
  } | null> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.quizSession.findFirst({
        where: {
          id: sessionId,
          userId,
          status: "IN_PROGRESS",
        },
      });

      if (!session) {
        throw new Error("Invalid or completed session");
      }

      const selectedQuizIds = JSON.parse(session.selectedQuizIds as string);

      const currentIndex = selectedQuizIds.indexOf(currentQuizId);
      if (currentIndex === -1) {
        throw new Error("Current quiz not found in session");
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= selectedQuizIds.length) {
        return null;
      }

      const nextQuizId = selectedQuizIds[nextIndex];
      const nextQuiz = await tx.quiz.findUnique({
        where: { id: nextQuizId },
        include: { category: true, answers: true },
      });

      if (!nextQuiz) {
        throw new Error("Failed to fetch next quiz");
      }

      const previousQuizId =
        currentIndex > 0 ? selectedQuizIds[currentIndex - 1] : null;
      const followingQuizId =
        nextIndex + 1 < selectedQuizIds.length
          ? selectedQuizIds[nextIndex + 1]
          : null;

      const currentQuizWithDetails = {
        ...nextQuiz,
        currentQuizIndex: nextIndex,
        previousQuizId,
        nextQuizId: followingQuizId,
      };

      return {
        currentQuiz: currentQuizWithDetails,
      };
    });
  }

  private buildWhereClause(where: any) {
    const conditions = [];
    if (where.difficulty)
      conditions.push(`"difficulty" = '${where.difficulty}'`);
    if (where.categoryId) conditions.push(`"categoryId" = ${where.categoryId}`);
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
          coinsEarned: selectedAnswer.isCorrect ? quiz.maxPrize : 0,
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
