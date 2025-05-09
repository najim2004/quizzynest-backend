import { compare, hash } from "bcryptjs";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";
import { prisma } from "../../config/database";
import { AuthTokens, GetMe, JwtPayloadInput, SignUpBody } from "./auth.types";
import "dotenv";

export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async signUp(data: SignUpBody): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: await this.hashPassword(data.password),
        fullName: data.fullName,
        profile: { create: {} },
      },
    });

    return !!user;
  }

  async signIn(data: { email: string; password: string }): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
      },
    });

    if (!user || !(await this.verifyPassword(data.password, user.password))) {
      throw new Error("Invalid credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as JwtPayload;

      if (!decoded || !decoded.sub) {
        throw new Error("Invalid refresh token");
      }
      const user = await this.prisma.user.findUnique({
        where: { id: parseInt(decoded?.sub) },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new Error("User no longer exists");
      }

      return this.generateTokens(user);
    } catch {
      throw new Error("Invalid refresh token");
    }
  }

  private generateTokens(
    user: Pick<User, "id" | "email" | "role">
  ): AuthTokens {
    const payload: JwtPayloadInput = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    // Convert expiresIn to number before using in sign options
    const accessTokenExpiration = parseInt(
      process.env.JWT_ACCESS_EXPIRATION || "3600"
    );
    const refreshTokenExpiration = parseInt(
      process.env.JWT_REFRESH_EXPIRATION || "604800"
    );

    const accessToken = sign(payload, process.env.JWT_ACCESS_SECRET || "", {
      expiresIn: accessTokenExpiration,
    });

    const refreshToken = sign(payload, process.env.JWT_REFRESH_SECRET || "", {
      expiresIn: refreshTokenExpiration,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiration,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  private async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return compare(password, hashedPassword);
  }

  async getMe(id: number): Promise<GetMe> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        profile: {
          select: {
            profilePic: true,
            bio: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Unauthorized");
    }

    return user;
  }
}
