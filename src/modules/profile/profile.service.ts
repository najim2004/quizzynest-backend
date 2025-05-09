import { PrismaClient, Achievement } from "@prisma/client";
import { prisma } from "../../config/database";
import { QuizHistoryResult, UserStats } from "./profile.type";

export class ProfileService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Utility function to get start of current month
  private getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  // Fetch user stats with optimized category-based top 5 average accuracy
  async getUserStats(userId: number): Promise<UserStats> {
    const startOfMonth = this.getStartOfMonth();

    try {
      // Parallel queries for basic stats and monthly stats
      const [basicStats, monthlyStats, categoryScores] = await Promise.all([
        this.prisma.quizResult.aggregate({
          where: { userId },
          _count: { _all: true },
          _sum: { totalCoinsEarned: true, correctAnswers: true },
          _avg: { accuracy: true },
          _max: { accuracy: true },
        }),
        this.prisma.quizResult.aggregate({
          where: { userId, completedAt: { gte: startOfMonth } },
          _sum: { totalCoinsEarned: true },
        }),
        // Optimized query for top 5 category average accuracy
        this.getTopCategoryScores(userId),
      ]);

      const monthlyRank = await this.calculateMonthlyRank(
        startOfMonth,
        monthlyStats._sum.totalCoinsEarned ?? 0
      );

      return {
        totalPlayedQuizzes: basicStats._count._all,
        totalEarnedCoin: basicStats._sum.totalCoinsEarned ?? 0,
        totalCorrectAnswers: basicStats._sum.correctAnswers ?? 0,
        highScore: basicStats._max.accuracy ?? 0,
        successRate: Number((basicStats._avg.accuracy ?? 0).toFixed(2)),
        rankThisMonth: monthlyRank,
        categoryScores,
      };
    } catch (error) {
      console.error("[ProfileService] Failed to fetch user stats:", error);
      throw new Error("Unable to retrieve user statistics");
    }
  }

  // Optimized method to calculate top 5 category average accuracy
  private async getTopCategoryScores(userId: number): Promise<
    {
      categoryId: number;
      categoryName: string;
      accuracy: number;
      quizCount: number;
    }[]
  > {
    // Step 1: Fetch quiz results grouped by category with raw SQL or optimized Prisma query
    const categoryStats = await this.prisma.$queryRaw<
      {
        categoryId: number;
        categoryName: string;
        averageAccuracy: number;
        quizCount: number;
      }[]
    >`
      SELECT 
      c.id AS "categoryId",
      c.name AS "categoryName",
      AVG(qr.accuracy) AS "averageAccuracy",
      COUNT(DISTINCT qr.id) AS "quizCount"
      FROM "quiz_results" qr
      JOIN "user_question_answers" uqa ON qr.id = uqa."quizResultId"
      JOIN "quizzes" q ON uqa."quizId" = q.id
      JOIN "categories" c ON q."categoryId" = c.id
      WHERE qr."userId" = ${userId}
      GROUP BY c.id, c.name
      ORDER BY "averageAccuracy" DESC
      LIMIT 5
    `;

    // Ensure type safety and handle empty results
    return categoryStats.map((stat) => ({
      categoryId: stat.categoryId,
      categoryName: stat.categoryName,
      accuracy: Number(stat.averageAccuracy.toFixed(2)), // Ensure float precision
      quizCount: Number(stat.quizCount),
    }));
  }

  // Calculate monthly rank based on total coins earned
  private async calculateMonthlyRank(
    startOfMonth: Date,
    userCoins: number
  ): Promise<number> {
    try {
      const higherCoinsCount = await this.prisma.quizResult.groupBy({
        by: ["userId"],
        where: { completedAt: { gte: startOfMonth } },
        _sum: { totalCoinsEarned: true },
        having: { totalCoinsEarned: { _sum: { gt: userCoins } } },
      });

      return higherCoinsCount.length + 1;
    } catch (error) {
      console.error(
        "[ProfileService] Failed to calculate monthly rank:",
        error
      );
      return 1; // Fallback rank
    }
  }

  // Fetch user achievements
  async getUserAchievements(userId: number): Promise<Achievement[]> {
    try {
      return await this.prisma.achievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
      });
    } catch (error) {
      console.error("[ProfileService] Failed to fetch achievements:", error);
      return [];
    }
  }

  // Fetch user quiz history
  async getUserPlayedQuizzes(userId: number): Promise<QuizHistoryResult[]> {
    try {
      const quizResults = await this.prisma.quizResult.findMany({
        where: { userId },
        select: {
          id: true,
          totalQuestions: true,
          correctAnswers: true,
          totalTimeSpent: true,
          totalCoinsEarned: true,
          accuracy: true,
          completedAt: true,
          questionResults: {
            select: {
              quiz: {
                select: {
                  category: {
                    select: { name: true, id: true, color: true, icon: true },
                  },
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { completedAt: "desc" },
      });

      return quizResults.map((result) => ({
        category: result.questionResults[0]?.quiz.category ?? null,
        id: result.id,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        totalTimeSpent: result.totalTimeSpent,
        totalCoinsEarned: result.totalCoinsEarned,
        accuracy: result.accuracy,
        completedAt: result.completedAt,
      }));
    } catch (error) {
      console.error("[ProfileService] Failed to fetch quiz history:", error);
      return [];
    }
  }
}
