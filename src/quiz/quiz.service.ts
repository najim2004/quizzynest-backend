import {
  PrismaClient,
  Quiz,
  QuizResult,
  Difficulty,
  Prisma,
  QuizSession,
  UserQuestionAnswer,
} from "@prisma/client"; // Add Prisma import
import * as crypto from "crypto";
import {
  CreateQuizDto,
  UpdateQuizDto,
  QuizFilterDto,
  AdminQuizFilterDto,
  QuizAnswerResponse,
  MetricsData,
  ClientQuiz,
  QuizSessionResponse,
  SubmitQuizAnswerResponse,
} from "./quiz.type";

export class QuizService {
  private prisma: PrismaClient;
  private encryptionKey: Buffer;
  private readonly ivLength: number = 16;

  constructor() {
    this.prisma = new PrismaClient();
    // Create a 32-byte key using SHA-256 hash of the original key
    const rawKey =
      process.env.ENCRYPTION_KEY || "mysecretkey12345678901234567890";
    this.encryptionKey = crypto.createHash("sha256").update(rawKey).digest();
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

  async startQuizSession(
    userId: number,
    filters: QuizFilterDto
  ): Promise<QuizSessionResponse> {
    return this.prisma.$transaction(async (tx) => {
      const { limit = 10, difficulty, categoryId } = filters;

      // Build conditions array
      const conditions: Prisma.Sql[] = [];
      if (difficulty) {
        conditions.push(Prisma.sql`difficulty = ${difficulty}`);
      }
      if (categoryId) {
        conditions.push(Prisma.sql`"categoryId" = ${categoryId}`);
      }

      // Construct the WHERE clause
      const whereClause =
        conditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
          : Prisma.sql`WHERE TRUE`;

      const selectedQuizIds = await tx.$queryRaw<{ id: number }[]>`
        SELECT id
        FROM "quizzes"
        ${whereClause}
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
        include: { answers: true },
      });

      if (!firstQuiz) {
        throw new Error("Failed to fetch first quiz");
      }
      const startTime = new Date();
      const encryptedStartTime = this.encryptStartTime(startTime);

      // Update the answer filtering to preserve the label type
      const filteredAnswers = firstQuiz.answers.map(
        ({ isCorrect, ...rest }) => ({
          ...rest,
          label: rest.label as "A" | "B" | "C" | "D", // Ensure correct label type
        })
      );

      const currentQuizWithDetails: ClientQuiz = {
        ...firstQuiz,
        answers: filteredAnswers,
        currentQuizIndex: 0,
        startTime: encryptedStartTime,
      };

      return {
        sessionId: session.id,
        currentQuiz: currentQuizWithDetails,
        totalQuizzes: quizIds.length,
      };
    });
  }

  // Update the encryption method
  private encryptStartTime(startTime: Date): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv);
    let encrypted = cipher.update(startTime.toISOString(), "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  // Update the decryption method
  private decryptStartTime(encrypted: string): Date {
    const [ivHex, encryptedText] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      this.encryptionKey,
      iv
    );
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return new Date(decrypted);
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

      const where: Prisma.QuizWhereInput = {
        ...(difficulty && { difficulty }),
        ...(categoryId && { categoryId }),
        ...(createdBy && { createdBy }),
        ...(search && {
          OR: [
            {
              question: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
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
        data: [] as Quiz[],
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
    answerId: number | null,
    encryptedStartTime: string
  ): Promise<SubmitQuizAnswerResponse> {
    return this.prisma.$transaction(async (tx) => {
      const [session, quiz] = await Promise.all([
        tx.quizSession.findFirstOrThrow({
          where: { id: sessionId, userId, status: "IN_PROGRESS" },
          select: { selectedQuizIds: true },
        }),
        tx.quiz.findUniqueOrThrow({
          where: { id: quizId },
          select: {
            id: true,
            question: true,
            timeLimit: true,
            maxPrize: true,
            difficulty: true,
            answers: {
              select: { id: true, label: true, text: true, isCorrect: true },
            },
          },
        }),
      ]);

      const quizIds = (session.selectedQuizIds as number[]) || [];
      const currentIndex = quizIds.indexOf(quizId);
      if (currentIndex === -1) throw new Error("Quiz not found in session");

      const timeTaken = Math.floor(
        (Date.now() - this.decryptStartTime(encryptedStartTime).getTime()) /
          1000
      );
      if (quiz.timeLimit && timeTaken > quiz.timeLimit)
        throw new Error("Time limit exceeded");

      const selectedAnswer = answerId
        ? quiz.answers.find((a) => a.id === answerId) || quiz.answers[0]
        : quiz.answers.find((a) => !a.isCorrect) || quiz.answers[0];

      const metrics: MetricsData = {
        isCorrect: selectedAnswer.isCorrect,
        timeTaken,
        coinsEarned: selectedAnswer.isCorrect ? quiz.maxPrize : 0,
      };

      const [userAnswer] = await Promise.all([
        tx.userQuestionAnswer.create({
          data: {
            userId,
            quizId,
            selectedAnswerId: selectedAnswer.id,
            sessionId,
          },
          select: { id: true },
        }),
        tx.quizSession.update({
          where: { id: sessionId },
          data: { answeredCount: { increment: 1 } },
        }),
      ]);

      await tx.questionAttemptMetrics.create({
        data: { userAnswerId: userAnswer.id, ...metrics },
      });

      const nextQuizId =
        currentIndex + 1 < quizIds.length ? quizIds[currentIndex + 1] : null;
      const nextQuiz = nextQuizId
        ? await tx.quiz
            .findUnique({
              where: { id: nextQuizId },
              select: {
                id: true,
                question: true,
                description: true,
                timeLimit: true,
                maxPrize: true,
                difficulty: true,
                categoryId: true,
                answers: { select: { id: true, label: true, text: true } },
              },
            })
            .then(
              (q): ClientQuiz | null =>
                q && {
                  ...q,
                  answers: q.answers.map((a) => ({
                    ...a,
                    label: a.label as "A" | "B" | "C" | "D",
                  })),
                  currentQuizIndex: currentIndex + 1,
                  startTime: this.encryptStartTime(new Date()),
                }
            )
        : null;

      return {
        answerResponse: {
          correct: selectedAnswer.isCorrect,
          earnedCoins: metrics.coinsEarned,
          timeTaken,
        },
        nextQuiz,
      };
    });
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
