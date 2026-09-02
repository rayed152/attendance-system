import React from 'react';
import { AlertTriangle, UserX } from 'lucide-react';
import { AttendanceRecord } from '../../electron/services/attendance.service';

interface AttendanceGraphProps {
  records: AttendanceRecord[];
}

interface DayPoint {
  date: string;
  label: string;
  entryTime?: number;
  entryLabel?: string;
  entryStatus?: string | null;
  exitTime?: number;
  exitLabel?: string;
  exitStatus?: string | null;
  isAbsent?: boolean;
}

const CHART_HEIGHT = 200;
const MAX_DAYS = 14;

// Validated categorical pair (blue / red) — passes CVD + normal-vision
// separation at dark-surface contrast, unlike emerald/rose which fail
// deuteranopia separation (ΔE 5.6).
const ENTRY_COLOR = '#3987e5';
const EXIT_COLOR = '#e66767';

const parseHours = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
};

const formatHourLabel = (h: number): string => {
  const hh = Math.floor(h);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}${period}`;
};

const buildDayPoints = (records: AttendanceRecord[]): DayPoint[] => {
  const map = new Map<string, DayPoint>();

  records.forEach((r) => {
    if (!map.has(r.date)) {
      map.set(r.date, { date: r.date, label: r.date });
    }
    const dp = map.get(r.date)!;

    if (r.type === 'ENTRY' && dp.entryTime === undefined) {
      dp.entryTime = parseHours(r.time);
      dp.entryLabel = r.time.slice(0, 5);
      dp.entryStatus = r.statusFlag;
    } else if (r.type === 'EXIT' && dp.exitTime === undefined) {
      dp.exitTime = parseHours(r.time);
      dp.exitLabel = r.time.slice(0, 5);
      dp.exitStatus = r.statusFlag;
    } else if (r.type === 'ABSENT') {
      dp.isAbsent = true;
    }
  });

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_DAYS)
    .map((dp) => ({
      ...dp,
      label: new Date(`${dp.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
};

export const AttendanceGraph: React.FC<AttendanceGraphProps> = ({ records }) => {
  const dayPoints = buildDayPoints(records);
  const allTimes = dayPoints.flatMap((p) => [p.entryTime, p.exitTime].filter((t): t is number => t !== undefined));

  if (dayPoints.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="font-medium text-sm text-slate-300">No data available to graph</p>
      </div>
    );
  }

  const domainMin = allTimes.length ? Math.max(0, Math.floor(Math.min(...allTimes)) - 1) : 8;
  const domainMax = allTimes.length ? Math.min(24, Math.ceil(Math.max(...allTimes)) + 1) : 18;
  const domainRange = Math.max(1, domainMax - domainMin);

  const tickStep = domainRange <= 6 ? 1 : domainRange <= 12 ? 2 : 3;
  const ticks: number[] = [];
  for (let t = Math.ceil(domainMin / tickStep) * tickStep; t <= domainMax; t += tickStep) {
    ticks.push(t);
  }

  const barHeight = (time: number) => ((time - domainMin) / domainRange) * CHART_HEIGHT;
  const tickTop = (t: number) => CHART_HEIGHT - ((t - domainMin) / domainRange) * CHART_HEIGHT;

  return (
    <div className="p-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mb-6 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTRY_COLOR }} />
          Entry Time
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: EXIT_COLOR }} />
          Exit Time
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Late Entry
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          Early Exit
        </div>
        <div className="flex items-center gap-2">
          <UserX className="w-3.5 h-3.5 text-rose-400" />
          Absent
        </div>
      </div>

      <div className="flex gap-2">
        {/* Y-axis */}
        <div className="relative shrink-0 w-10 font-mono text-[10px] text-slate-500" style={{ height: CHART_HEIGHT }}>
          {ticks.map((t) => (
            <div key={t} className="absolute right-1 -translate-y-1/2" style={{ top: tickTop(t) }}>
              {formatHourLabel(t)}
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 overflow-x-auto">
          <div className="relative inline-flex items-end gap-6 pr-2" style={{ height: CHART_HEIGHT }}>
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute left-0 right-0 border-t border-slate-800/60"
                style={{ top: tickTop(t) }}
              />
            ))}

            {dayPoints.map((dp) => (
              <div key={dp.date} className="flex flex-col items-center gap-2 shrink-0" style={{ width: 44 }}>
                <div className="relative flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
                  {dp.isAbsent ? (
                    /* Absent marker — spans the full column instead of entry/exit bars */
                    <div className="group relative flex flex-col items-center justify-end w-9" style={{ height: CHART_HEIGHT }}>
                      <div className="w-full h-full rounded-t-[4px] bg-rose-950/40 border border-rose-900/50 border-b-0 flex flex-col items-center justify-center gap-1.5">
                        <UserX className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="pointer-events-none absolute bottom-full mb-2 z-10 hidden group-hover:flex flex-col items-center whitespace-nowrap">
                        <div className="glass-panel rounded-lg px-2.5 py-1.5 text-[11px] shadow-xl border border-slate-700">
                          <p className="font-bold text-rose-300">Absent</p>
                          <p className="text-slate-400">{dp.label}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                  {/* Entry bar */}
                  <div className="group relative flex flex-col items-center justify-end w-4" style={{ height: CHART_HEIGHT }}>
                    {dp.entryTime !== undefined && (
                      <>
                        {dp.entryStatus === 'LATE' && (
                          <AlertTriangle
                            className="w-3 h-3 text-amber-400 absolute"
                            style={{ bottom: barHeight(dp.entryTime) + 4 }}
                          />
                        )}
                        <div
                          className="w-full rounded-t-[4px]"
                          style={{ height: Math.max(2, barHeight(dp.entryTime)), backgroundColor: ENTRY_COLOR }}
                        />
                        <div className="pointer-events-none absolute bottom-full mb-2 z-10 hidden group-hover:flex flex-col items-center whitespace-nowrap">
                          <div className="glass-panel rounded-lg px-2.5 py-1.5 text-[11px] shadow-xl border border-slate-700">
                            <p className="font-bold text-slate-100">Entry · {dp.entryLabel}</p>
                            <p className="text-slate-400">{dp.label}{dp.entryStatus === 'LATE' ? ' · LATE' : ''}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Exit bar */}
                  <div className="group relative flex flex-col items-center justify-end w-4" style={{ height: CHART_HEIGHT }}>
                    {dp.exitTime !== undefined && (
                      <>
                        {dp.exitStatus === 'EARLY_EXIT' && (
                          <AlertTriangle
                            className="w-3 h-3 text-orange-400 absolute"
                            style={{ bottom: barHeight(dp.exitTime) + 4 }}
                          />
                        )}
                        <div
                          className="w-full rounded-t-[4px]"
                          style={{ height: Math.max(2, barHeight(dp.exitTime)), backgroundColor: EXIT_COLOR }}
                        />
                        <div className="pointer-events-none absolute bottom-full mb-2 z-10 hidden group-hover:flex flex-col items-center whitespace-nowrap">
                          <div className="glass-panel rounded-lg px-2.5 py-1.5 text-[11px] shadow-xl border border-slate-700">
                            <p className="font-bold text-slate-100">Exit · {dp.exitLabel}</p>
                            <p className="text-slate-400">{dp.label}{dp.exitStatus === 'EARLY_EXIT' ? ' · EARLY EXIT' : ''}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                    </>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-500">{dp.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
