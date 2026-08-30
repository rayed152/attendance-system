import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface UserSession {
  id: string;
  userId: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  message?: string;
}

export class AuthService {
  private prisma: PrismaClient;
  private currentSession: UserSession | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async login(userIdInput: string, passwordInput: string): Promise<AuthResponse> {
    try {
      if (!userIdInput || !passwordInput) {
        return {
          success: false,
          message: 'User ID and Password are required.',
        };
      }

      const trimmedUserId = userIdInput.trim();

      const user = await this.prisma.user.findUnique({
        where: { userId: trimmedUserId },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid User ID or Password.',
        };
      }

      const isPasswordValid = await bcrypt.compare(passwordInput, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid User ID or Password.',
        };
      }

      this.currentSession = {
        id: user.id,
        userId: user.userId,
        name: user.name,
        role: user.role,
      };

      return {
        success: true,
        user: this.currentSession,
      };
    } catch (error: any) {
      console.error('AuthService.login error:', error);
      return {
        success: false,
        message: 'Unable to connect to database or server error occurred.',
      };
    }
  }

  logout(): AuthResponse {
    this.currentSession = null;
    return { success: true };
  }

  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }
}
