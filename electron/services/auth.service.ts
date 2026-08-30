import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TenantService } from './tenant.service';

export interface UserSession {
  id: string;
  organizationId: string;
  companyName: string;
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
  private tenantService: TenantService;
  private currentSession: UserSession | null = null;

  constructor(prisma: PrismaClient, tenantService: TenantService) {
    this.prisma = prisma;
    this.tenantService = tenantService;
  }

  async login(userIdInput: string, passwordInput: string): Promise<AuthResponse> {
    try {
      if (!userIdInput || !passwordInput) {
        return {
          success: false,
          message: 'User ID and Password are required.',
        };
      }

      // Check active tenant bound to this desktop app
      const activeTenantRes = await this.tenantService.getActiveTenant();
      if (!activeTenantRes.success || !activeTenantRes.tenant) {
        return {
          success: false,
          message: 'Application is not activated for any company. Please activate your License Key first.',
        };
      }

      const tenant = activeTenantRes.tenant;
      const trimmedUserId = userIdInput.trim();

      const user = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: tenant.id,
            userId: trimmedUserId,
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid User ID or Password for this company.',
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
        organizationId: user.organizationId,
        companyName: tenant.name,
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
