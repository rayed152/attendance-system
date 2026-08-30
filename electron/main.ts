import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { TenantService } from './services/tenant.service';
import { AuthService } from './services/auth.service';
import { AttendanceService } from './services/attendance.service';
import { AdminService } from './services/admin.service';

// Load environment variables
dotenv.config();

let mainWindow: BrowserWindow | null = null;
const prisma = new PrismaClient();
const tenantService = new TenantService(prisma);
const authService = new AuthService(prisma, tenantService);
const attendanceService = new AttendanceService(prisma, tenantService);
const adminService = new AdminService(prisma, attendanceService);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 850,
    minHeight: 650,
    title: 'Attendance System (SaaS)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Tenant / License Handlers
  ipcMain.handle('tenant:getActiveTenant', async () => {
    return await tenantService.getActiveTenant();
  });

  ipcMain.handle('tenant:validateLicenseKey', async (_event, licenseKey: string) => {
    return await tenantService.validateAndSetLicenseKey(licenseKey);
  });

  ipcMain.handle('tenant:clearLicenseKey', async () => {
    tenantService.clearLicenseKey();
    authService.logout();
    return { success: true };
  });

  ipcMain.handle('tenant:searchOrganizations', async (_event, query: string) => {
    return await tenantService.searchOrganizations(query);
  });

  ipcMain.handle('tenant:registerOrganization', async (_event, input) => {
    return await tenantService.registerOrganization(input);
  });

  // Auth Handlers
  ipcMain.handle('auth:login', async (_event, credentials) => {
    const { userId, password } = credentials || {};
    return await authService.login(userId, password);
  });

  ipcMain.handle('auth:logout', async () => {
    return authService.logout();
  });

  ipcMain.handle('auth:getSession', async () => {
    return authService.getCurrentSession();
  });

  // Attendance Handlers
  ipcMain.handle('attendance:entry', async () => {
    const user = authService.getCurrentSession();
    return await attendanceService.recordEntry(user);
  });

  ipcMain.handle('attendance:exit', async () => {
    const user = authService.getCurrentSession();
    return await attendanceService.recordExit(user);
  });

  ipcMain.handle('attendance:getStatus', async () => {
    const user = authService.getCurrentSession();
    return await attendanceService.getStatus(user);
  });

  ipcMain.handle('attendance:getHistory', async () => {
    const user = authService.getCurrentSession();
    return await attendanceService.getHistory(user);
  });

  ipcMain.handle('attendance:getWarnings', async () => {
    const user = authService.getCurrentSession();
    return await attendanceService.getWarnings(user);
  });

  ipcMain.handle('attendance:dismissWarning', async (_event, warningId: string) => {
    const user = authService.getCurrentSession();
    return await attendanceService.dismissWarning(warningId, user);
  });

  // Admin Handlers
  ipcMain.handle('admin:registerUser', async (_event, input) => {
    const user = authService.getCurrentSession();
    return await adminService.registerUser(user, input);
  });

  ipcMain.handle('admin:getAllUsers', async () => {
    const user = authService.getCurrentSession();
    return await adminService.getAllUsers(user);
  });

  ipcMain.handle('admin:getAllAttendance', async (_event, targetUserId?: string) => {
    const user = authService.getCurrentSession();
    return await adminService.getAllAttendance(user, targetUserId);
  });

  ipcMain.handle('admin:updateAttendance', async (_event, input) => {
    const user = authService.getCurrentSession();
    return await adminService.updateAttendance(user, input);
  });

  ipcMain.handle('admin:warnUser', async (_event, data) => {
    const user = authService.getCurrentSession();
    const { targetUserId, message } = data || {};
    return await adminService.warnUser(user, targetUserId, message);
  });

  ipcMain.handle('admin:getConfig', async () => {
    const user = authService.getCurrentSession();
    return await adminService.getConfig(user);
  });

  ipcMain.handle('admin:updateConfig', async (_event, input) => {
    const user = authService.getCurrentSession();
    return await adminService.updateConfig(user, input);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  await prisma.$disconnect();
});
