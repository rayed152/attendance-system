import { PrismaClient, AttendanceType } from '@prisma/client';
import { UserSession } from './auth.service';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  type: 'ENTRY' | 'EXIT';
  statusFlag?: string | null; // 'LATE' | 'EARLY_EXIT' | 'ON_TIME'
  note?: string | null;
  timestamp: string; // ISO string
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm:ss
}

export interface SystemConfigData {
  lateEntryTime: string; // "HH:mm"
  earlyExitTime: string; // "HH:mm"
}

export interface AttendanceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class AttendanceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get active system config (lateEntryTime & earlyExitTime thresholds)
   */
  async getConfig(): Promise<SystemConfigData> {
    try {
      let config = await this.prisma.systemConfig.findUnique({
        where: { id: 'default' },
      });

      if (!config) {
        config = await this.prisma.systemConfig.create({
          data: {
            id: 'default',
            lateEntryTime: '09:00',
            earlyExitTime: '17:00',
          },
        });
      }

      return {
        lateEntryTime: config.lateEntryTime || '09:00',
        earlyExitTime: config.earlyExitTime || '17:00',
      };
    } catch (err) {
      console.error('AttendanceService.getConfig error:', err);
      return { lateEntryTime: '09:00', earlyExitTime: '17:00' };
    }
  }

  /**
   * Determine punctuality status flag based on timestamp, type, and configured thresholds
   */
  public async calculateStatusFlag(type: AttendanceType, timestamp: Date): Promise<string> {
    const config = await this.getConfig();
    const tsMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();

    if (type === AttendanceType.ENTRY) {
      const [lateH, lateM] = (config.lateEntryTime || '09:00').split(':').map(Number);
      const thresholdMinutes = lateH * 60 + lateM;

      if (tsMinutes > thresholdMinutes) {
        return 'LATE';
      }
      return 'ON_TIME';
    } else {
      const [earlyH, earlyM] = (config.earlyExitTime || '17:00').split(':').map(Number);
      const thresholdMinutes = earlyH * 60 + earlyM;

      if (tsMinutes < thresholdMinutes) {
        return 'EARLY_EXIT';
      }
      return 'ON_TIME';
    }
  }

  /**
   * Record ENTRY attendance
   */
  async recordEntry(sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    try {
      const latest = await this.prisma.attendance.findFirst({
        where: { userId: sessionUser.userId },
        orderBy: { timestamp: 'desc' },
      });

      if (latest && latest.type === AttendanceType.ENTRY) {
        return {
          success: false,
          message: 'You are already checked in. Please record an Exit before entering again.',
        };
      }

      const now = new Date();
      const statusFlag = await this.calculateStatusFlag(AttendanceType.ENTRY, now);
      const config = await this.getConfig();

      const newRecord = await this.prisma.attendance.create({
        data: {
          userId: sessionUser.userId,
          type: AttendanceType.ENTRY,
          statusFlag,
          timestamp: now,
        },
      });

      const message = statusFlag === 'LATE'
        ? `Entry recorded successfully. Note: Marked as LATE ENTRY (after ${config.lateEntryTime}).`
        : 'Entry recorded successfully.';

      return {
        success: true,
        message,
        data: this.formatRecord(newRecord),
      };
    } catch (error: any) {
      console.error('AttendanceService.recordEntry error:', error);
      return {
        success: false,
        message: 'Failed to record Entry due to database error.',
      };
    }
  }

  /**
   * Record EXIT attendance
   */
  async recordExit(sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    try {
      const latest = await this.prisma.attendance.findFirst({
        where: { userId: sessionUser.userId },
        orderBy: { timestamp: 'desc' },
      });

      if (!latest || latest.type === AttendanceType.EXIT) {
        return {
          success: false,
          message: 'No active Entry record found. You must record an Entry before recording an Exit.',
        };
      }

      const now = new Date();
      const statusFlag = await this.calculateStatusFlag(AttendanceType.EXIT, now);
      const config = await this.getConfig();

      const newRecord = await this.prisma.attendance.create({
        data: {
          userId: sessionUser.userId,
          type: AttendanceType.EXIT,
          statusFlag,
          timestamp: now,
        },
      });

      const message = statusFlag === 'EARLY_EXIT'
        ? `Exit recorded successfully. Note: Marked as EARLY EXIT (before ${config.earlyExitTime}).`
        : 'Exit recorded successfully.';

      return {
        success: true,
        message,
        data: this.formatRecord(newRecord),
      };
    } catch (error: any) {
      console.error('AttendanceService.recordExit error:', error);
      return {
        success: false,
        message: 'Failed to record Exit due to database error.',
      };
    }
  }

  /**
   * Get current status for logged-in user
   */
  async getStatus(sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const latest = await this.prisma.attendance.findFirst({
        where: { userId: sessionUser.userId },
        orderBy: { timestamp: 'desc' },
      });

      const status = latest ? (latest.type === AttendanceType.ENTRY ? 'IN' : 'OUT') : 'OUT';

      return {
        success: true,
        data: { status, latestRecord: latest ? this.formatRecord(latest) : null },
      };
    } catch (error: any) {
      console.error('AttendanceService.getStatus error:', error);
      return { success: false, message: 'Error fetching attendance status.' };
    }
  }

  /**
   * Get attendance records for history
   */
  async getHistory(sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const records = await this.prisma.attendance.findMany({
        where: { userId: sessionUser.userId },
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true } } },
      });

      const formatted = records.map((rec) => this.formatRecord(rec));

      return {
        success: true,
        data: formatted,
      };
    } catch (error: any) {
      console.error('AttendanceService.getHistory error:', error);
      return { success: false, message: 'Error fetching attendance history.' };
    }
  }

  /**
   * Fetch warnings for the logged-in user
   */
  async getWarnings(sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const warnings = await this.prisma.warning.findMany({
        where: { userId: sessionUser.userId, isRead: false },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: warnings,
      };
    } catch (error: any) {
      console.error('AttendanceService.getWarnings error:', error);
      return { success: false, message: 'Error fetching user warnings.' };
    }
  }

  /**
   * Dismiss warning for user
   */
  async dismissWarning(warningId: string, sessionUser: UserSession | null): Promise<AttendanceResponse> {
    if (!sessionUser) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      await this.prisma.warning.updateMany({
        where: { id: warningId, userId: sessionUser.userId },
        data: { isRead: true },
      });

      return { success: true, message: 'Warning dismissed.' };
    } catch (error: any) {
      console.error('AttendanceService.dismissWarning error:', error);
      return { success: false, message: 'Failed to dismiss warning.' };
    }
  }

  formatRecord(record: any): AttendanceRecord {
    const d = new Date(record.timestamp);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().split(' ')[0];

    return {
      id: record.id,
      userId: record.userId,
      userName: record.user?.name,
      type: record.type,
      statusFlag: record.statusFlag,
      note: record.note,
      timestamp: d.toISOString(),
      date: dateStr,
      time: timeStr,
    };
  }
}
