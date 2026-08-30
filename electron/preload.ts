import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  auth: {
    login: (credentials: { userId: string; password: string }) =>
      ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
  },
  attendance: {
    entry: () => ipcRenderer.invoke('attendance:entry'),
    exit: () => ipcRenderer.invoke('attendance:exit'),
    getStatus: () => ipcRenderer.invoke('attendance:getStatus'),
    getHistory: () => ipcRenderer.invoke('attendance:getHistory'),
    getWarnings: () => ipcRenderer.invoke('attendance:getWarnings'),
    dismissWarning: (warningId: string) => ipcRenderer.invoke('attendance:dismissWarning', warningId),
  },
  admin: {
    getAllUsers: () => ipcRenderer.invoke('admin:getAllUsers'),
    getAllAttendance: (targetUserId?: string) =>
      ipcRenderer.invoke('admin:getAllAttendance', targetUserId),
    updateAttendance: (input: { id: string; type?: 'ENTRY' | 'EXIT'; timestamp?: string; note?: string }) =>
      ipcRenderer.invoke('admin:updateAttendance', input),
    warnUser: (targetUserId: string, message: string) =>
      ipcRenderer.invoke('admin:warnUser', { targetUserId, message }),
    getConfig: () => ipcRenderer.invoke('admin:getConfig'),
    updateConfig: (input: { lateEntryTime: string; earlyExitTime: string }) =>
      ipcRenderer.invoke('admin:updateConfig', input),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
