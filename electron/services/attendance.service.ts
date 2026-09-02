import { PrismaClient, AttendanceType } from '@prisma/client';
import { UserSession } from './auth.service';
import { TenantService } from './tenant.service';

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  type: 'ENTRY' | 'EXIT' | 'ABSENT';
  statusFlag?: string | null;
  note?: string | null;
  timestamp: string;
  date: string;
  time: string;
}

// How many recent days to scan for synthetic ABSENT rows when building
// logs/graph data — matches AttendanceGraph's own recent-days window, so
// what shows in the graph and what shows in the logs stay in sync.
const ABSENCE_WINDOW_DAYS = 14;

export interface SystemConfigData {
  lateEntryTime: string;
  earlyExitTime: string;
  workingDays: number[]; // 0=Sun .. 6=Sat
}

export interface AbsentUser {
  userId: string;
  name: string;
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

const parseWorkingDays = (raw: string | null | undefined): number[] => {
  if (!raw) return DEFAULT_WORKING_DAYS;
  const parsed = raw
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d >= 0 && d <= 6);
  return parsed.length > 0 ? parsed : DEFAULT_WORKING_DAYS;
};

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
        return { lateEntryTime: '09:00', earlyExitTime: '17:00', workingDays: DEFAULT_WORKING_DAYS };
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
        workingDays: parseWorkingDays(config.workingDays),
      };
    } catch (err) {
      console.error('AttendanceService.getConfig error:', err);
      return { lateEntryTime: '09:00', earlyExitTime: '17:00', workingDays: DEFAULT_WORKING_DAYS };
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
   * UTC-day [start, end) bounds for a YYYY-MM-DD string, matching the same
   * UTC-based date convention used by formatRecord()'s `date` field.
   */
  private dateStrToUtcRange(dateStr: string): { start: Date; end: Date } {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  /**
   * Whether the given date is a working day for the organization: its
   * weekday must be in the configured working days, and it must not have
   * been marked as an ad-hoc Off Day (holiday) by an admin.
   */
  async isWorkingDay(organizationId: string, dateStr: string): Promise<{ isWorkingDay: boolean; offDayLabel?: string | null }> {
    const offDay = await this.prisma.offDay.findUnique({
      where: { organizationId_date: { organizationId, date: dateStr } },
    });

    if (offDay) {
      return { isWorkingDay: false, offDayLabel: offDay.label };
    }

    const config = await this.getConfig(organizationId);
    const weekday = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();

    return { isWorkingDay: config.workingDays.includes(weekday) };
  }

  /**
   * Users who have no ENTRY record on a given working day (i.e. absent).
   * Returns an empty list (with isWorkingDay: false) for non-working days,
   * since absence isn't tracked on days off.
   */
  async getAbsentUsers(organizationId: string, dateStr: string): Promise<{ isWorkingDay: boolean; offDayLabel?: string | null; absentUsers: AbsentUser[] }> {
    const dayCheck = await this.isWorkingDay(organizationId, dateStr);
    if (!dayCheck.isWorkingDay) {
      return { ...dayCheck, absentUsers: [] };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr > todayStr) {
      return { ...dayCheck, absentUsers: [] };
    }

    const { start, end } = this.dateStrToUtcRange(dateStr);

    const [allUsers, presentEntries] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId, isBlocked: false },
        select: { userId: true, name: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          organizationId,
          type: AttendanceType.ENTRY,
          timestamp: { gte: start, lt: end },
        },
        select: { userId: true },
      }),
    ]);

    const presentUserIds = new Set(presentEntries.map((r) => r.userId));
    const absentUsers = allUsers.filter((u) => !presentUserIds.has(u.userId));

    return { ...dayCheck, absentUsers };
  }

  /**
   * Synthetic ABSENT rows for the recent ABSENCE_WINDOW_DAYS window, one per
   * (user, missed working day). Used to surface absences alongside real
   * ENTRY/EXIT rows in the attendance logs table and graph. Restricted to a
   * recent window rather than full history, since scanning a user's entire
   * tenure day-by-day would be unbounded and mostly not useful to show.
   */
  async getAbsenceRecordsForRange(organizationId: string, targetUserId?: string, days: number = ABSENCE_WINDOW_DAYS): Promise<AttendanceRecord[]> {
    const absenceRecords: AttendanceRecord[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const dateStr = d.toISOString().split('T')[0];

      const { isWorkingDay: isWorking, absentUsers } = await this.getAbsentUsers(organizationId, dateStr);
      if (!isWorking) continue;

      const scoped = targetUserId ? absentUsers.filter((u) => u.userId === targetUserId) : absentUsers;

      for (const u of scoped) {
        absenceRecords.push({
          id: `absent-${u.userId}-${dateStr}`,
          organizationId,
          userId: u.userId,
          userName: u.name,
          type: 'ABSENT',
          statusFlag: 'ABSENT',
          note: null,
          timestamp: `${dateStr}T00:00:00.000Z`,
          date: dateStr,
          time: '--:--:--',
        });
      }
    }

    return absenceRecords;
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
      const absences = await this.getAbsenceRecordsForRange(sessionUser.organizationId, sessionUser.userId);
      const merged = [...formatted, ...absences].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

      return {
        success: true,
        data: merged,
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
