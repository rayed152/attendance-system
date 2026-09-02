import React, { useState, useEffect } from "react";
import {
  LogIn,
  LogOut as LogOutIcon,
  Calendar,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  User,
  UserX,
  BarChart3,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AttendanceRecord } from "../../electron/services/attendance.service";
import { AttendanceGraph } from "./AttendanceGraph";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  showUserColumn?: boolean;
  onEditRecord?: (record: AttendanceRecord) => void;
  onDeleteRecord?: (record: AttendanceRecord) => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  showUserColumn = false,
  onEditRecord,
  onDeleteRecord,
}) => {
  const [viewMode, setViewMode] = useState<"logs" | "graph">("logs");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  if (!records || records.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="font-medium text-base text-slate-300">
          No attendance records found
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Logs will appear here when entries or exits are recorded.
        </p>
      </div>
    );
  }

  const PAGE_SIZE = 7;
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedRecords = records.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          Attendance History
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800">
            {records.length} {records.length === 1 ? "record" : "records"}
          </span>
          <button
            onClick={() =>
              setViewMode((mode) => (mode === "logs" ? "graph" : "logs"))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-all"
            title={
              viewMode === "logs"
                ? "Switch to graph view"
                : "Switch to logs view"
            }
          >
            {viewMode === "logs" ? (
              <>
                <BarChart3 className="w-3.5 h-3.5" />
                Graph
              </>
            ) : (
              <>
                <ListChecks className="w-3.5 h-3.5" />
                Logs
              </>
            )}
          </button>
        </div>
      </div>

      {viewMode === "graph" ? (
        <AttendanceGraph records={records} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  {showUserColumn && <th className="px-6 py-3">User</th>}
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Punctuality Status</th>
                  <th className="px-6 py-3">Notes</th>
                  {(onEditRecord || onDeleteRecord) && (
                    <th className="px-6 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {pagedRecords.map((record) => {
                  const isEntry = record.type === "ENTRY";
                  const isAbsent = record.type === "ABSENT";
                  const isLate = record.statusFlag === "LATE";
                  const isEarlyExit = record.statusFlag === "EARLY_EXIT";

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-800/30 transition-colors ${isAbsent ? "opacity-80" : ""}`}
                    >
                      {showUserColumn && (
                        <td className="px-6 py-3.5 text-slate-200">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <div>
                              <span className="font-semibold block leading-none">
                                {record.userName || record.userId}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {record.userId}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-3.5 text-slate-300">
                        {record.date}
                      </td>

                      <td className="px-6 py-3.5">
                        {isAbsent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
                            <UserX className="w-3.5 h-3.5" />
                            ABSENT
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isEntry
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                                : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                            }`}
                          >
                            {isEntry ? (
                              <LogIn className="w-3.5 h-3.5" />
                            ) : (
                              <LogOutIcon className="w-3.5 h-3.5" />
                            )}
                            {record.type}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-slate-200 font-bold tracking-wide">
                        {isAbsent ? <span className="text-slate-600">—</span> : record.time}
                      </td>

                      <td className="px-6 py-3.5">
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                            <UserX className="w-3 h-3 text-rose-400" />
                            ABSENT
                          </span>
                        )}
                        {isLate && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            LATE ENTRY (&gt; 9 AM)
                          </span>
                        )}
                        {isEarlyExit && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-950 text-orange-400 border border-orange-800/80">
                            <AlertTriangle className="w-3 h-3 text-orange-400" />
                            EARLY EXIT (&lt; 5 PM)
                          </span>
                        )}
                        {!isAbsent && !isLate && !isEarlyExit && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            ON TIME
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-slate-400 italic font-sans text-xs max-w-xs truncate">
                        {isAbsent ? "No attendance recorded" : record.note || "—"}
                      </td>

                      {(onEditRecord || onDeleteRecord) && (
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isAbsent && onEditRecord && (
                              <button
                                onClick={() => onEditRecord(record)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 text-sky-300 text-xs font-semibold transition-all"
                                title="Edit attendance record"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}

                            {!isAbsent && onDeleteRecord && (
                              <button
                                onClick={() => onDeleteRecord(record)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-all"
                                title="Delete attendance record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="text-slate-300 font-semibold">
                  {pageStart + 1}–
                  {Math.min(pageStart + PAGE_SIZE, records.length)}
                </span>{" "}
                of{" "}
                <span className="text-slate-300 font-semibold">
                  {records.length}
                </span>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                <span className="text-xs font-mono text-slate-400 px-2">
                  Page {page} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
