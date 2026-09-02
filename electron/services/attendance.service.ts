import { PrismaClient, AttendanceType } from '@prisma/client';
import { UserSession } from './auth.service';
import { TenantService } from './tenant.service';

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  type: 'ENTRY' | 'EXIT';
  statusFlag?: string | null;
  note?: string | null;
  timestamp: string;
  date: string;
  time: string;
}

export interface SystemConfigData {
  lateEntryTime: string;
  earlyExitTime: string;
}

export interface AttendanceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class AttendanceService {
  private prisma: PrismaClient;
  private tenantService: TenantService;

  constructor(prisma: PrismaClient, tenantService: TenantService) {
    this.prisma = prisma;
    this.tenantService = tenantService;
  }

  /**
   * Get system config for a specific organization
   */
  async getConfig(organizationId?: string): Promise<SystemConfigData> {
    try {
      let targetOrgId = organizationId;
      if (!targetOrgId) {
        const tenantRes = await this.tenantService.getActiveTenant();
        if (tenantRes.success && tenantRes.tenant) {
          targetOrgId = tenantRes.tenant.id;
        }
      }

      if (!targetOrgId) {
        return { lateEntryTime: '09:00', earlyExitTime: '17:00' };
      }

      let config = await this.prisma.systemConfig.findUnique({
        where: { organizationId: targetOrgId },
      });

      if (!config) {
        config = await this.prisma.systemConfig.create({
          data: {
            organizationId: targetOrgId,
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
   * Local calendar-day bounds [start, end) for a given date, used to enforce
   * one Entry + one Exit per day (resets at local midnight).
   */
  private getDayBounds(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  /**
   * Determine status flag based on timestamp, type, and organization thresholds
   */
  public async calculateStatusFlag(organizationId: string, type: AttendanceType, timestamp: Date): Promise<string> {
    const config = await this.getConfig(organizationId);
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
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
        orderBy: { timestamp: 'desc' },
      });

      if (latest && latest.type === AttendanceType.ENTRY) {
        return {
          success: false,
          message: 'You are already checked in. Please record an Exit before entering again.',
        };
      }

      const { start, end } = this.getDayBounds();
      const entryUsedToday = await this.prisma.attendance.findFirst({
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
          type: AttendanceType.ENTRY,
          timestamp: { gte: start, lt: end },
        },
      });

      if (entryUsedToday) {
        return {
          success: false,
          message: 'You have already recorded an Entry today. Entry resets at midnight.',
          data: { resetAt: end.toISOString() },
        };
      }

      const now = new Date();
      const statusFlag = await this.calculateStatusFlag(sessionUser.organizationId, AttendanceType.ENTRY, now);
      const config = await this.getConfig(sessionUser.organizationId);

      const newRecord = await this.prisma.attendance.create({
        data: {
          organizationId: sessionUser.organizationId,
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
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
        orderBy: { timestamp: 'desc' },
      });

      if (!latest || latest.type === AttendanceType.EXIT) {
        return {
          success: false,
          message: 'No active Entry record found. You must record an Entry before recording an Exit.',
        };
      }

      const { start, end } = this.getDayBounds();
      const exitUsedToday = await this.prisma.attendance.findFirst({
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
          type: AttendanceType.EXIT,
          timestamp: { gte: start, lt: end },
        },
      });

      if (exitUsedToday) {
        return {
          success: false,
          message: 'You have already recorded an Exit today. Exit resets at midnight.',
          data: { resetAt: end.toISOString() },
        };
      }

      const now = new Date();
      const statusFlag = await this.calculateStatusFlag(sessionUser.organizationId, AttendanceType.EXIT, now);
      const config = await this.getConfig(sessionUser.organizationId);

      const newRecord = await this.prisma.attendance.create({
        data: {
          organizationId: sessionUser.organizationId,
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
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
        orderBy: { timestamp: 'desc' },
      });

      const status = latest ? (latest.type === AttendanceType.ENTRY ? 'IN' : 'OUT') : 'OUT';

      const { start, end } = this.getDayBounds();
      const [entryUsedToday, exitUsedToday] = await Promise.all([
        this.prisma.attendance.findFirst({
          where: {
            organizationId: sessionUser.organizationId,
            userId: sessionUser.userId,
            type: AttendanceType.ENTRY,
            timestamp: { gte: start, lt: end },
          },
        }),
        this.prisma.attendance.findFirst({
          where: {
            organizationId: sessionUser.organizationId,
            userId: sessionUser.userId,
            type: AttendanceType.EXIT,
            timestamp: { gte: start, lt: end },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          status,
          latestRecord: latest ? this.formatRecord(latest) : null,
          entryUsedToday: !!entryUsedToday,
          exitUsedToday: !!exitUsedToday,
          canEntry: status === 'OUT' && !entryUsedToday,
          canExit: status === 'IN' && !exitUsedToday,
          resetAt: end.toISOString(),
        },
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
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
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
        where: {
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
          isRead: false,
        },
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
        where: {
          id: warningId,
          organizationId: sessionUser.organizationId,
          userId: sessionUser.userId,
        },
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
      organizationId: record.organizationId,
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
