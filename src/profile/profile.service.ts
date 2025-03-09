import { PrismaClient, User, Achievement } from "@prisma/client";
import { prisma } from "../config/database";
import { QuizHistoryResult, UserStats } from "./profile.type";

export class ProfileService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getUserStats = async (userId: number): Promise<UserStats> => {
    try {
      // Get start of current month for monthly ranking
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Fetch all required data in parallel
      const [totalQuizResults, monthlyQuizResults] = await Promise.all([
        // Get all quiz results for total stats
        this.prisma.quizResult.aggregate({
          where: { userId },
          _count: {
            _all: true, // For total played quizzes
          },
          _sum: {
            totalCoinsEarned: true, // For total coins
            correctAnswers: true, // For total correct answers
          },
        }),

        // Get monthly quiz results for ranking
        this.prisma.quizResult.findMany({
          where: {
            userId,
            completedAt: { gte: startOfMonth },
          },
          orderBy: {
            accuracy: "desc",
          },
          take: 1,
          select: {
            accuracy: true,
          },
        }),
      ]);

      // Calculate monthly rank based on accuracy
      const monthlyRank = await this.calculateMonthlyRank(
        startOfMonth,
        monthlyQuizResults[0]?.accuracy ?? 0
      );

      // Calculate success rate (accuracy)
      const allQuizResults = await this.prisma.quizResult.findMany({
        where: { userId },
        select: { accuracy: true },
      });

      const averageAccuracy =
        allQuizResults.length > 0
          ? allQuizResults.reduce((sum, result) => sum + result.accuracy, 0) /
            allQuizResults.length
          : 0;

      return {
        totalPlayedQuizzes: totalQuizResults._count._all,
        totalEarnedCoin: totalQuizResults._sum.totalCoinsEarned ?? 0,
        highScore: Math.max(
          ...allQuizResults.map((result) => result.accuracy),
          0
        ), // Using accuracy as score
        totalCorrectAnswers: totalQuizResults._sum.correctAnswers ?? 0,
        rankThisMonth: monthlyRank,
        successRate: Number(averageAccuracy.toFixed(2)),
      };
    } catch (error) {
      console.error("[Profile] Failed to fetch user stats:", error);
      throw new Error("Failed to fetch user statistics");
    }
  };

  private async calculateMonthlyRank(
    startOfMonth: Date,
    userAccuracy: number
  ): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId")::integer as count
        FROM "quiz_results"
        WHERE "completedAt" >= ${startOfMonth}
        AND "accuracy" > ${userAccuracy}
      `;

      return Number(result[0]?.count ?? 0) + 1;
    } catch (error) {
      console.error("[Profile] Failed to calculate monthly rank:", error);
      return 1;
    }
  }

  getUserAchievements = async (userId: number): Promise<Achievement[]> => {
    try {
      return this.prisma.achievement.findMany({
        where: { userId },
      });
    } catch (error) {
      console.error("[Profile] Failed to fetch user achievements:", error);
      return [];
    }
  };

  getUserPlayedQuizzes = async (
    userId: number
  ): Promise<QuizHistoryResult[]> => {
    try {
      const quizResults = await this.prisma.quizResult.findMany({
        where: {
          userId,
        },
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
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            take: 1,
          },
        },
        orderBy: {
          completedAt: "desc",
        },
      });

      if (!quizResults?.length) {
        return [];
      }

      return quizResults.map((result) => {
        const categoryName =
          result.questionResults[0]?.quiz.category.name || "Unknown";
        const { questionResults, ...quizResult } = result;

        return {
          categoryName,
          ...quizResult,
        };
      });
    } catch (error) {
      console.error("[Profile] Failed to fetch user played quizzes:", error);
      return []; // Return empty array instead of throwing error
    }
  };
}
