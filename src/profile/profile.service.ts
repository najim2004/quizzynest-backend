import { PrismaClient, Achievement } from "@prisma/client";
import { prisma } from "../config/database";
import { QuizHistoryResult, UserStats } from "./profile.type";

export class ProfileService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Utility function to get start of current month
  private getStartOfMonth(): Date {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Optimized user stats retrieval with monthly rank based on coins
  async getUserStats(userId: number): Promise<UserStats> {
    const startOfMonth = this.getStartOfMonth();

    try {
      // Single query to get all stats
      const [stats, monthlyStats] = await Promise.all([
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
      ]);

      const monthlyRank = await this.calculateMonthlyRank(
        startOfMonth,
        monthlyStats._sum.totalCoinsEarned ?? 0
      );

      return {
        totalPlayedQuizzes: stats._count._all,
        totalEarnedCoin: stats._sum.totalCoinsEarned ?? 0,
        totalCorrectAnswers: stats._sum.correctAnswers ?? 0,
        highScore: stats._max.accuracy ?? 0,
        successRate: Number((stats._avg.accuracy ?? 0).toFixed(2)),
        rankThisMonth: monthlyRank,
      };
    } catch (error) {
      console.error("[ProfileService] Failed to fetch user stats:", error);
      throw new Error("Unable to retrieve user statistics");
    }
  }

  // Monthly rank calculation based on totalCoinsEarned
  private async calculateMonthlyRank(
    startOfMonth: Date,
    userCoins: number
  ): Promise<number> {
    try {
      const higherCoinsCount = await this.prisma.quizResult
        .groupBy({
          by: ["userId"],
          where: {
            completedAt: { gte: startOfMonth },
          },
          _sum: { totalCoinsEarned: true },
          having: {
            totalCoinsEarned: { _sum: { gt: userCoins } },
          },
        })
        .then((results) => results.length);

      return higherCoinsCount + 1;
    } catch (error) {
      console.error(
        "[ProfileService] Failed to calculate monthly rank:",
        error
      );
      return 1; // Default rank if calculation fails
    }
  }

  // Fetch user achievements
  async getUserAchievements(userId: number): Promise<Achievement[]> {
    try {
      return await this.prisma.achievement.findMany({
        where: { userId },
      });
    } catch (error) {
      console.error("[ProfileService] Failed to fetch achievements:", error);
      return [];
    }
  }

  // Optimized quiz history retrieval
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
        category: result.questionResults[0]?.quiz.category || null,
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
