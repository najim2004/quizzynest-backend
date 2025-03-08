import { PrismaClient, Prisma } from "@prisma/client";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ["error", "warn"],
    });

    this.setupQueryLogging();
  }

  private setupQueryLogging(): void {
    this.prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      console.log(`[Database Query] ${new Date().toISOString()}`);
      console.log(`Query: ${params.model}.${params.action}`);
      console.log(`Parameters: ${JSON.stringify(params.args)}`);
      console.log(`Duration: ${after - before}ms`);
      console.log("-".repeat(50));

      return result;
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error(
        "[Database] Connection error:",
        error instanceof Error ? error.message : "Unknown error"
      );
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log("[Database] Disconnected successfully");
    } catch (error) {
      console.error(
        "[Database] Disconnection error:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }
}

// Create database instance
const db = DatabaseConnection.getInstance();
const prisma = db.getPrisma();

// Export functions and prisma client
export { prisma, db as database };

// Export connect and disconnect functions
export const connectDB = () => db.connect();
export const disconnectDB = () => db.disconnect();
