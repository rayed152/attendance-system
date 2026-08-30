import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  tenant: {
    getActiveTenant: () => ipcRenderer.invoke('tenant:getActiveTenant'),
    validateLicenseKey: (licenseKey: string) => ipcRenderer.invoke('tenant:validateLicenseKey', licenseKey),
    clearLicenseKey: () => ipcRenderer.invoke('tenant:clearLicenseKey'),
    searchOrganizations: (query: string) => ipcRenderer.invoke('tenant:searchOrganizations', query),
    registerOrganization: (input: { name: string; companyCode: string; licenseKey: string; adminUserId?: string; adminPassword?: string }) =>
      ipcRenderer.invoke('tenant:registerOrganization', input),
  },
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
    registerUser: (input: { userId: string; name: string; password: string; role: 'USER' | 'ADMIN' }) =>
      ipcRenderer.invoke('admin:registerUser', input),
    updateUser: (input: { userId: string; name?: string; role?: 'USER' | 'ADMIN'; newPassword?: string }) =>
      ipcRenderer.invoke('admin:updateUser', input),
    toggleBlockUser: (targetUserId: string) => ipcRenderer.invoke('admin:toggleBlockUser', targetUserId),
    deleteUser: (targetUserId: string) => ipcRenderer.invoke('admin:deleteUser', targetUserId),
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
    updateBranding: (input: { name?: string; logoUrl?: string }) =>
      ipcRenderer.invoke('admin:updateBranding', input),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
