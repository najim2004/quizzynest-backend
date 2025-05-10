import { PrismaClient } from "@prisma/client";

export class QuizGenerationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }


}

export const quizGenerationRepository = new QuizGenerationRepository();
