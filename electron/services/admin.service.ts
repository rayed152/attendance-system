import { PrismaClient, Role, AttendanceType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserSession } from './auth.service';
import { AttendanceService } from './attendance.service';

export interface RecordAttendanceInput {
  targetUserId: string;
  type: 'ENTRY' | 'EXIT';
}

export interface UpdateAttendanceInput {
  id: string;
  type?: 'ENTRY' | 'EXIT';
  timestamp?: string;
  note?: string;
}

export interface UpdateConfigInput {
  lateEntryTime: string;
  earlyExitTime: string;
}

export interface RegisterUserInput {
  userId: string;
  name: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  userId: string;
  name?: string;
  role?: Role;
  newPassword?: string;
}

export interface UpdateBrandingInput {
  name?: string;
  logoUrl?: string;
}

export class AdminService {
  private prisma: PrismaClient;
  private attendanceService: AttendanceService;

  constructor(prisma: PrismaClient, attendanceService: AttendanceService) {
    this.prisma = prisma;
    this.attendanceService = attendanceService;
  }

  private verifyAdmin(sessionUser: UserSession | null): { valid: boolean; message?: string } {
    if (!sessionUser) {
      return { valid: false, message: 'Session expired or invalid. Please log out and log in again.' };
    }
    if (sessionUser.role !== Role.ADMIN) {
      return { valid: false, message: 'Access denied. Admin privileges required.' };
    }
    return { valid: true };
  }

  /**
   * Register a new user in Admin's Organization (Admin only)
   */
  async registerUser(sessionUser: UserSession | null, input: RegisterUserInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    const { userId, name, password, role } = input || {};
    if (!userId || !userId.trim() || !name || !name.trim() || !password) {
      return { success: false, message: 'User ID, Full Name, and Password are required.' };
    }

    const trimmedUserId = userId.trim();
    const trimmedName = name.trim();

    try {
      const existing = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId: trimmedUserId,
          },
        },
      });

      if (existing) {
        return {
          success: false,
          message: `User ID "${trimmedUserId}" already exists in your company.`,
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await this.prisma.user.create({
        data: {
          organizationId: sessionUser!.organizationId,
          userId: trimmedUserId,
          name: trimmedName,
          passwordHash,
          role: role || Role.USER,
          isBlocked: false,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        message: `User "${newUser.name}" (${newUser.userId}) registered successfully as ${newUser.role}.`,
        data: newUser,
      };
    } catch (error: any) {
      console.error('AdminService.registerUser error:', error);
      return { success: false, message: error?.message || 'Failed to register new user.' };
    }
  }

  /**
   * Edit user info (name, role, password reset)
   */
  async updateUser(sessionUser: UserSession | null, input: UpdateUserInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    const { userId, name, role, newPassword } = input || {};
    if (!userId) {
      return { success: false, message: 'Target User ID is required.' };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId,
          },
        },
      });

      if (!user) {
        return { success: false, message: 'User not found in your company.' };
      }

      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (role) updateData.role = role;
      if (newPassword && newPassword.trim()) {
        updateData.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      }

      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          isBlocked: true,
        },
      });

      return {
        success: true,
        message: `User "${updated.name}" (${updated.userId}) updated successfully.`,
        data: updated,
      };
    } catch (error: any) {
      console.error('AdminService.updateUser error:', error);
      return { success: false, message: error?.message || 'Failed to update user.' };
    }
  }

  /**
   * Block / Unblock user
   */
  async toggleBlockUser(sessionUser: UserSession | null, targetUserId: string) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    if (targetUserId === sessionUser!.userId) {
      return { success: false, message: 'You cannot block your own admin account.' };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId: targetUserId,
          },
        },
      });

      if (!user) {
        return { success: false, message: 'User not found in your company.' };
      }

      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { isBlocked: !user.isBlocked },
      });

      const action = updated.isBlocked ? 'blocked / suspended' : 'unblocked';
      return {
        success: true,
        message: `User "${updated.name}" (${updated.userId}) has been ${action}.`,
        data: { userId: updated.userId, isBlocked: updated.isBlocked },
      };
    } catch (error: any) {
      console.error('AdminService.toggleBlockUser error:', error);
      return { success: false, message: error?.message || 'Failed to toggle user status.' };
    }
  }

  /**
   * Kick / Delete user from company
   */
  async deleteUser(sessionUser: UserSession | null, targetUserId: string) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    if (targetUserId === sessionUser!.userId) {
      return { success: false, message: 'You cannot delete your own admin account.' };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId: targetUserId,
          },
        },
      });

      if (!user) {
        return { success: false, message: 'User not found in your company.' };
      }

      await this.prisma.user.delete({ where: { id: user.id } });

      return {
        success: true,
        message: `User "${user.name}" (${user.userId}) has been removed from company.`,
      };
    } catch (error: any) {
      console.error('AdminService.deleteUser error:', error);
      return { success: false, message: error?.message || 'Failed to delete user.' };
    }
  }

  /**
   * Fetch all registered users in Admin's Organization
   */
  async getAllUsers(sessionUser: UserSession | null) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    try {
      const users = await this.prisma.user.findMany({
        where: { organizationId: sessionUser!.organizationId },
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: users };
    } catch (error: any) {
      console.error('AdminService.getAllUsers error:', error);
      return { success: false, message: error?.message || 'Failed to fetch users.' };
    }
  }

  /**
   * Fetch attendance records in Admin's Organization
   */
  async getAllAttendance(sessionUser: UserSession | null, targetUserId?: string) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    try {
      const whereCondition: any = { organizationId: sessionUser!.organizationId };
      if (targetUserId && targetUserId !== 'ALL') {
        whereCondition.userId = targetUserId;
      }

      const records = await this.prisma.attendance.findMany({
        where: whereCondition,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, userId: true } } },
      });

      const formatted = records.map((rec) => this.attendanceService.formatRecord(rec));

      return { success: true, data: formatted };
    } catch (error: any) {
      console.error('AdminService.getAllAttendance error:', error);
      return { success: false, message: error?.message || 'Failed to fetch attendance records.' };
    }
  }

  /**
   * Edit attendance record in Admin's Organization
   */
  async updateAttendance(sessionUser: UserSession | null, input: UpdateAttendanceInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    try {
      const { id, type, timestamp, note } = input;

      const existing = await this.prisma.attendance.findFirst({
        where: { id, organizationId: sessionUser!.organizationId },
      });

      if (!existing) {
        return { success: false, message: 'Attendance record not found in your organization.' };
      }

      const newTimestamp = timestamp ? new Date(timestamp) : existing.timestamp;
      const newType = type ? (type as AttendanceType) : existing.type;

      const statusFlag = await this.attendanceService.calculateStatusFlag(
        sessionUser!.organizationId,
        newType,
        newTimestamp
      );

      const updated = await this.prisma.attendance.update({
        where: { id },
        data: {
          type: newType,
          timestamp: newTimestamp,
          statusFlag,
          note: note !== undefined ? note : existing.note,
        },
      });

      return {
        success: true,
        message: 'Attendance record updated successfully.',
        data: this.attendanceService.formatRecord(updated),
      };
    } catch (error: any) {
      console.error('AdminService.updateAttendance error:', error);
      return { success: false, message: error?.message || 'Failed to update attendance record.' };
    }
  }

  /**
   * Delete an attendance record in Admin's Organization
   */
  async deleteAttendance(sessionUser: UserSession | null, id: string) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    if (!id) {
      return { success: false, message: 'Attendance record ID is required.' };
    }

    try {
      const existing = await this.prisma.attendance.findFirst({
        where: { id, organizationId: sessionUser!.organizationId },
      });

      if (!existing) {
        return { success: false, message: 'Attendance record not found in your organization.' };
      }

      await this.prisma.attendance.delete({ where: { id } });

      return {
        success: true,
        message: 'Attendance record deleted successfully.',
      };
    } catch (error: any) {
      console.error('AdminService.deleteAttendance error:', error);
      return { success: false, message: error?.message || 'Failed to delete attendance record.' };
    }
  }

  /**
   * Record an Entry or Exit on behalf of a user in Admin's Organization
   * (e.g. the user forgot to check in/out themselves). Goes through the
   * same AttendanceService rules as a self-recorded Entry/Exit (checked-in
   * state, one Entry + one Exit per day), just attributed to the target user.
   */
  async recordAttendanceForUser(sessionUser: UserSession | null, input: RecordAttendanceInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    const { targetUserId, type } = input || ({} as RecordAttendanceInput);
    if (!targetUserId || (type !== 'ENTRY' && type !== 'EXIT')) {
      return { success: false, message: 'Target User ID and a valid attendance type (ENTRY/EXIT) are required.' };
    }

    try {
      const targetUser = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId: targetUserId,
          },
        },
      });

      if (!targetUser) {
        return { success: false, message: 'Target user does not exist in your organization.' };
      }

      if (targetUser.isBlocked) {
        return { success: false, message: `Cannot record attendance: "${targetUser.name}" is currently blocked.` };
      }

      const targetSession: UserSession = {
        id: targetUser.id,
        organizationId: sessionUser!.organizationId,
        companyName: sessionUser!.companyName,
        userId: targetUser.userId,
        name: targetUser.name,
        role: targetUser.role,
      };

      const result = type === 'ENTRY'
        ? await this.attendanceService.recordEntry(targetSession)
        : await this.attendanceService.recordExit(targetSession);

      if (!result.success) {
        return result;
      }

      return {
        ...result,
        message: `${type === 'ENTRY' ? 'Entry' : 'Exit'} recorded for ${targetUser.name} (${targetUser.userId}) by admin.`,
      };
    } catch (error: any) {
      console.error('AdminService.recordAttendanceForUser error:', error);
      return { success: false, message: error?.message || 'Failed to record attendance for user.' };
    }
  }

  /**
   * Issue warning to a user in Admin's Organization
   */
  async warnUser(sessionUser: UserSession | null, targetUserId: string, message: string) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    if (!targetUserId || !message.trim()) {
      return { success: false, message: 'Target User ID and Warning message are required.' };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          organizationId_userId: {
            organizationId: sessionUser!.organizationId,
            userId: targetUserId,
          },
        },
      });

      if (!user) {
        return { success: false, message: 'Target user does not exist in your organization.' };
      }

      const warning = await this.prisma.warning.create({
        data: {
          organizationId: sessionUser!.organizationId,
          userId: targetUserId,
          message: message.trim(),
          issuedBy: sessionUser!.userId,
        },
      });

      return {
        success: true,
        message: `Warning issued to ${user.name} (${user.userId}) successfully.`,
        data: warning,
      };
    } catch (error: any) {
      console.error('AdminService.warnUser error:', error);
      return { success: false, message: error?.message || 'Failed to issue warning.' };
    }
  }

  /**
   * Get shift threshold settings for Admin's Organization
   */
  async getConfig(sessionUser: UserSession | null) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    try {
      const config = await this.attendanceService.getConfig(sessionUser!.organizationId);
      const org = await this.prisma.organization.findUnique({
        where: { id: sessionUser!.organizationId },
        select: { name: true, logoUrl: true, companyCode: true },
      });

      return {
        success: true,
        data: {
          ...config,
          companyName: org?.name,
          logoUrl: org?.logoUrl,
          companyCode: org?.companyCode,
        },
      };
    } catch (error: any) {
      console.error('AdminService.getConfig error:', error);
      return { success: false, message: error?.message || 'Failed to fetch settings.' };
    }
  }

  /**
   * Update shift threshold settings for Admin's Organization
   */
  async updateConfig(sessionUser: UserSession | null, input: UpdateConfigInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    const { lateEntryTime, earlyExitTime } = input;
    if (!lateEntryTime || !earlyExitTime) {
      return { success: false, message: 'Both Late Entry Time and Early Exit Time are required.' };
    }

    try {
      const updated = await this.prisma.systemConfig.upsert({
        where: { organizationId: sessionUser!.organizationId },
        update: { lateEntryTime, earlyExitTime },
        create: {
          organizationId: sessionUser!.organizationId,
          lateEntryTime,
          earlyExitTime,
        },
      });

      return {
        success: true,
        message: `Punctuality settings updated for your company! Late Entry threshold: ${updated.lateEntryTime}, Early Exit threshold: ${updated.earlyExitTime}.`,
        data: { lateEntryTime: updated.lateEntryTime, earlyExitTime: updated.earlyExitTime },
      };
    } catch (error: any) {
      console.error('AdminService.updateConfig error:', error);
      return { success: false, message: error?.message || 'Failed to update threshold settings.' };
    }
  }

  /**
   * Update Company Branding (Name and Logo URL)
   */
  async updateOrganizationBranding(sessionUser: UserSession | null, input: UpdateBrandingInput) {
    const authCheck = this.verifyAdmin(sessionUser);
    if (!authCheck.valid) {
      return { success: false, message: authCheck.message };
    }

    const { name, logoUrl } = input || {};
    try {
      const updated = await this.prisma.organization.update({
        where: { id: sessionUser!.organizationId },
        data: {
          name: name && name.trim() ? name.trim() : undefined,
          logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        },
      });

      if (sessionUser) {
        sessionUser.companyName = updated.name;
        sessionUser.logoUrl = updated.logoUrl;
      }

      return {
        success: true,
        message: 'Company Branding settings updated successfully.',
        data: { name: updated.name, logoUrl: updated.logoUrl },
      };
    } catch (error: any) {
      console.error('AdminService.updateOrganizationBranding error:', error);
      return { success: false, message: error?.message || 'Failed to update company branding.' };
    }
  }
}
