import { PrismaClient, Role, AttendanceType } from '@prisma/client';
import { UserSession } from './auth.service';
import { AttendanceService } from './attendance.service';

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

export class AdminService {
  private prisma: PrismaClient;
  private attendanceService: AttendanceService;

  constructor(prisma: PrismaClient, attendanceService: AttendanceService) {
    this.prisma = prisma;
    this.attendanceService = attendanceService;
  }

  private verifyAdmin(sessionUser: UserSession | null): boolean {
    return !!sessionUser && sessionUser.role === Role.ADMIN;
  }

  /**
   * Fetch all registered users (Admin only)
   */
  async getAllUsers(sessionUser: UserSession | null) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied. Admin privileges required.' };
    }

    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: users };
    } catch (error: any) {
      console.error('AdminService.getAllUsers error:', error);
      return { success: false, message: 'Failed to fetch users.' };
    }
  }

  /**
   * Fetch all attendance records across all users (Admin only)
   */
  async getAllAttendance(sessionUser: UserSession | null, targetUserId?: string) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied. Admin privileges required.' };
    }

    try {
      const whereCondition = targetUserId && targetUserId !== 'ALL'
        ? { userId: targetUserId }
        : {};

      const records = await this.prisma.attendance.findMany({
        where: whereCondition,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, userId: true } } },
      });

      const formatted = records.map((rec) => this.attendanceService.formatRecord(rec));

      return { success: true, data: formatted };
    } catch (error: any) {
      console.error('AdminService.getAllAttendance error:', error);
      return { success: false, message: 'Failed to fetch attendance records.' };
    }
  }

  /**
   * Edit attendance record (Admin only)
   */
  async updateAttendance(sessionUser: UserSession | null, input: UpdateAttendanceInput) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied. Admin privileges required.' };
    }

    try {
      const { id, type, timestamp, note } = input;

      const existing = await this.prisma.attendance.findUnique({ where: { id } });
      if (!existing) {
        return { success: false, message: 'Attendance record not found.' };
      }

      const newTimestamp = timestamp ? new Date(timestamp) : existing.timestamp;
      const newType = type ? (type as AttendanceType) : existing.type;

      // Recalculate status flag based on active configured thresholds
      const statusFlag = await this.attendanceService.calculateStatusFlag(newType, newTimestamp);

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
      return { success: false, message: 'Failed to update attendance record.' };
    }
  }

  /**
   * Issue warning to a user (Admin only)
   */
  async warnUser(sessionUser: UserSession | null, targetUserId: string, message: string) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied. Admin privileges required.' };
    }

    if (!targetUserId || !message.trim()) {
      return { success: false, message: 'Target User ID and Warning message are required.' };
    }

    try {
      const user = await this.prisma.user.findUnique({ where: { userId: targetUserId } });
      if (!user) {
        return { success: false, message: 'Target user does not exist.' };
      }

      const warning = await this.prisma.warning.create({
        data: {
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
      return { success: false, message: 'Failed to issue warning.' };
    }
  }

  /**
   * Get current attendance threshold settings (Admin only)
   */
  async getConfig(sessionUser: UserSession | null) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied.' };
    }

    try {
      const config = await this.attendanceService.getConfig();
      return { success: true, data: config };
    } catch (error: any) {
      console.error('AdminService.getConfig error:', error);
      return { success: false, message: 'Failed to fetch settings.' };
    }
  }

  /**
   * Update attendance threshold settings (Admin only)
   */
  async updateConfig(sessionUser: UserSession | null, input: UpdateConfigInput) {
    if (!this.verifyAdmin(sessionUser)) {
      return { success: false, message: 'Access denied. Admin privileges required.' };
    }

    const { lateEntryTime, earlyExitTime } = input;
    if (!lateEntryTime || !earlyExitTime) {
      return { success: false, message: 'Both Late Entry Time and Early Exit Time are required.' };
    }

    try {
      const updated = await this.prisma.systemConfig.upsert({
        where: { id: 'default' },
        update: { lateEntryTime, earlyExitTime },
        create: { id: 'default', lateEntryTime, earlyExitTime },
      });

      return {
        success: true,
        message: `Punctuality settings updated! Late Entry threshold: ${updated.lateEntryTime}, Early Exit threshold: ${updated.earlyExitTime}.`,
        data: { lateEntryTime: updated.lateEntryTime, earlyExitTime: updated.earlyExitTime },
      };
    } catch (error: any) {
      console.error('AdminService.updateConfig error:', error);
      return { success: false, message: 'Failed to update threshold settings.' };
    }
  }
}
