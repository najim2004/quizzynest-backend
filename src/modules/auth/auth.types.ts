import { Role } from "@prisma/client";
import { CommonResponse } from "../../types";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type JwtPayloadInput = {
  sub: string;
  email: string;
  role: string;
};

export type SignUpBody = {
  email: string;
  password: string;
  fullName: string;
};

export interface SignInBody {
  email: string;
  password: string;
}

export interface LoginResponse extends CommonResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type GetMe = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  profile: {
    profilePic: string | null;
    bio: string | null;
  } | null;
};
