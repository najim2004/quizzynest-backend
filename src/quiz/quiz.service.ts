import { PrismaClient, Quiz, Prisma } from "@prisma/client";
import * as crypto from "crypto";
import {
  CreateQuizDto,
  UpdateQuizDto,
  QuizFilterDto,
  AdminQuizFilterDto,
  ClientQuiz,
  QuizSessionResponse,
  SubmitQuizAnswerResponse,
  QuizResult as QuizResultType,
} from "./quiz.type";

export class QuizService {
  private prisma = new PrismaClient({ log: ["error", "warn"] });
  private encryptionKey = crypto
    .createHash("sha256")
    .update(process.env.ENCRYPTION_KEY || "mysecretkey12345678901234567890")
    .digest();
  private ivLength = 16;

  private encryptStartTime(startTime: Date): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv);
    return `${iv.toString("hex")}:${Buffer.concat([
      cipher.update(startTime.toISOString()),
      cipher.final(),
    ]).toString("hex")}`;
  }

  private decryptStartTime(encrypted: string): Date {
    const [ivHex, text] = encrypted.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      this.encryptionKey,
      Buffer.from(ivHex, "hex")
    );
    return new Date(
      Buffer.concat([
        decipher.update(Buffer.from(text, "hex")),
        decipher.final(),
      ]).toString()
    );
  }

  private async fetchQuiz(
    tx: Prisma.TransactionClient,
    id: number,
    withAnswers = true
  ): Promise<Quiz & { answers: any[] }> {
    return tx.quiz.findUniqueOrThrow({
      where: { id },
      include: { answers: withAnswers },
    });
  }

  private async prepareNextQuiz(
    tx: Prisma.TransactionClient,
    quizIds: number[],
    currentIndex: number
  ): Promise<ClientQuiz | null> {
    const nextQuizId =
      currentIndex + 1 < quizIds.length ? quizIds[currentIndex + 1] : null;
    if (!nextQuizId) return null;

    const quiz = await tx.quiz.findUnique({
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
    });

    return quiz
      ? {
          ...quiz,
          answers: quiz.answers.map((a) => ({
            ...a,
            label: a.label as "A" | "B" | "C" | "D",
          })),
          currentQuizIndex: currentIndex + 1,
          startTime: this.encryptStartTime(new Date()),
        }
      : null;
  }

  async createQuiz(userId: number, dto: CreateQuizDto): Promise<Quiz> {
    if (!dto.answers.some((a) => a.isCorrect))
      throw new Error("At least one correct answer required");

    return this.prisma.$transaction(async (tx) => {
      if (
        !(await tx.category.findUnique({
          where: { id: dto.categoryId },
          select: { id: true },
        }))
      )
        throw new Error("Category not found");
      return tx.quiz.create({
        data: {
          ...dto,
          categoryId: dto.categoryId,
          createdBy: userId,
          answers: { create: dto.answers },
        },
        include: { answers: true },
      });
    });
  }

  async getQuizById(id: number): Promise<Quiz> {
    return this.fetchQuiz(this.prisma, id);
  }

  async startQuizSession(
    userId: number,
    filters: QuizFilterDto
  ): Promise<QuizSessionResponse> {
    const { limit = 10, difficulty, categoryId } = filters;
    const where = {
      ...(difficulty && { difficulty }),
      ...(categoryId && { categoryId }),
    };

    // Fetch quiz IDs randomly using raw SQL
    const quizIdsResult = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id 
      FROM "quizzes" 
      WHERE ${
        where.difficulty
          ? Prisma.sql`"difficulty" = ${difficulty}`
          : Prisma.sql`TRUE`
      }
      AND ${
        where.categoryId
          ? Prisma.sql`"categoryId" = ${categoryId}`
          : Prisma.sql`TRUE`
      }
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;
    const quizIds = quizIdsResult.map((q) => q.id);

    if (!quizIds.length) throw new Error("No quizzes available");

    const startTime = new Date();
    const [session, firstQuiz] = await Promise.all([
      this.prisma.quizSession.create({
        data: {
          userId,
          status: "IN_PROGRESS",
          startedAt: startTime,
          selectedQuizIds: JSON.stringify(quizIds),
          totalQuestions: quizIds.length,
        },
      }),
      this.fetchQuiz(this.prisma, quizIds[0]),
    ]);

    return {
      sessionId: session.id,
      currentQuiz: {
        ...firstQuiz,
        answers: firstQuiz.answers.map((a) => ({
          id: a.id,
          label: a.label as "A" | "B" | "C" | "D",
          text: a.text,
        })),
        currentQuizIndex: 0,
        startTime: this.encryptStartTime(startTime),
      },
      totalQuizzes: quizIds.length,
    };
  }

  async getQuizzesForAdmin(filters: AdminQuizFilterDto): Promise<{
    data: Quiz[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
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
          { question: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        include: {
          answers: {
            select: { id: true, label: true, text: true, isCorrect: true },
          },
          creator: { select: { id: true, fullName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      data: quizzes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateQuiz(
    id: number,
    userId: number,
    dto: UpdateQuizDto
  ): Promise<Quiz> {
    if (
      !(await this.prisma.quiz.findFirst({
        where: { id, createdBy: userId },
        select: { id: true },
      }))
    )
      throw new Error("Quiz not found or unauthorized");

    return this.prisma.$transaction(async (tx) => {
      const { answers, ...rest } = dto;
      const data: Prisma.QuizUpdateInput = { ...rest };
      if (answers?.length) {
        await tx.answer.deleteMany({ where: { quizId: id } });
        data.answers = { createMany: { data: answers } };
      }
      return tx.quiz.update({
        where: { id },
        data,
        include: { answers: true },
      });
    });
  }

  async deleteQuiz(id: number, userId: number): Promise<boolean> {
    return (
      (await this.prisma.quiz.deleteMany({ where: { id, createdBy: userId } }))
        .count > 0
    );
  }

  async submitQuizAnswer(
    userId: number,
    sessionId: number,
    quizId: number,
    answerId: number | null,
    encryptedStartTime: string
  ): Promise<SubmitQuizAnswerResponse> {
    console.log(
      "[This console log is for debugging purposes]",
      "sessionId",
      sessionId,
      "quizId",
      quizId,
      "answerId",
      answerId,
      "encryptedStartTime",
      encryptedStartTime
    );
    return this.prisma.$transaction(async (tx) => {
      const timeTaken = Math.floor(
        (Date.now() - this.decryptStartTime(encryptedStartTime).getTime()) /
          1000
      );
      const [session, quiz] = await Promise.all([
        tx.quizSession.findFirstOrThrow({
          where: { id: sessionId, userId, status: "IN_PROGRESS" },
          select: {
            selectedQuizIds: true,
            totalQuestions: true,
            answeredCount: true,
          },
        }),
        this.fetchQuiz(tx, quizId),
      ]);

      const quizIds = JSON.parse(session.selectedQuizIds as string) as number[];
      const currentIndex = quizIds.indexOf(quizId);
      if (currentIndex === -1) throw new Error("Quiz not found in session");

      const effectiveAnswerId =
        quiz.timeLimit && timeTaken > quiz.timeLimit ? null : answerId;
      const finalAnswer = effectiveAnswerId
        ? quiz.answers.find((a) => a.id === effectiveAnswerId) ||
          quiz.answers.find((a) => !a.isCorrect) ||
          quiz.answers[0]
        : quiz.answers.find((a) => !a.isCorrect) || quiz.answers[0];
      const metrics = {
        isCorrect: finalAnswer.isCorrect,
        timeTaken,
        coinsEarned: finalAnswer.isCorrect ? quiz.maxPrize : 0,
      };

      const userAnswer = await tx.userQuestionAnswer.create({
        data: { userId, quizId, selectedAnswerId: finalAnswer.id, sessionId },
        select: { id: true },
      });
      await Promise.all([
        tx.questionAttemptMetrics.create({
          data: { userAnswerId: userAnswer.id, ...metrics },
        }),
        tx.quizSession.update({
          where: { id: sessionId },
          data: { answeredCount: { increment: 1 } },
        }),
      ]);

      const nextQuiz = await this.prepareNextQuiz(tx, quizIds, currentIndex);
      const response: SubmitQuizAnswerResponse = {
        answerResponse: {
          correct: finalAnswer.isCorrect,
          earnedCoins: metrics.coinsEarned,
          timeTaken,
        },
        nextQuiz,
      };

      if (!nextQuiz && session.answeredCount + 1 >= session.totalQuestions) {
        const answers = await tx.userQuestionAnswer.findMany({
          where: { sessionId },
          include: { metrics: true },
        });
        const summary = answers.reduce(
          (acc, a) => ({
            correctAnswers: acc.correctAnswers + (a.metrics?.isCorrect ? 1 : 0),
            totalTimeSpent: acc.totalTimeSpent + (a.metrics?.timeTaken || 0),
            totalCoinsEarned:
              acc.totalCoinsEarned + (a.metrics?.coinsEarned || 0),
          }),
          { correctAnswers: 0, totalTimeSpent: 0, totalCoinsEarned: 0 }
        );

        const accuracy = session.totalQuestions
          ? (summary.correctAnswers / session.totalQuestions) * 100
          : 0;
        response.result = (await tx.quizResult.create({
          data: {
            userId,
            ...summary,
            accuracy,
            totalQuestions: session.totalQuestions,
            questionResults: { connect: answers.map((a) => ({ id: a.id })) },
          },
          include: {
            questionResults: {
              include: { quiz: true, selectedAnswer: true, metrics: true },
            },
          },
        })) as unknown as QuizResultType;
        await tx.quizSession.update({
          where: { id: sessionId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      return response;
    });
  }
}
