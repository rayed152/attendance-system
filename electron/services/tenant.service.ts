import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

export interface TenantInfo {
  id: string;
  name: string;
  companyCode: string;
  licenseKey: string;
  isVerified: boolean;
}

export interface TenantResponse {
  success: boolean;
  message?: string;
  tenant?: TenantInfo;
  data?: any;
}

export class TenantService {
  private prisma: PrismaClient;
  private configFilePath: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    const userDataPath = app.getPath('userData');
    this.configFilePath = path.join(userDataPath, 'tenant-config.json');
  }

  /**
   * Get locally stored license key
   */
  getStoredLicenseKey(): string | null {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const data = fs.readFileSync(this.configFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        return parsed.licenseKey || null;
      }
    } catch (err) {
      console.error('Error reading tenant config file:', err);
    }
    return null;
  }

  /**
   * Store license key locally
   */
  setStoredLicenseKey(licenseKey: string): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify({ licenseKey }, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing tenant config file:', err);
    }
  }

  /**
   * Clear local license key (un-bind application)
   */
  clearLicenseKey(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        fs.unlinkSync(this.configFilePath);
      }
    } catch (err) {
      console.error('Error removing tenant config file:', err);
    }
  }

  /**
   * Validate license key against database Organization table
   * Only VERIFIED organizations (isVerified === true) are allowed
   */
  async validateAndSetLicenseKey(licenseKeyInput: string): Promise<TenantResponse> {
    if (!licenseKeyInput || !licenseKeyInput.trim()) {
      return { success: false, message: 'Please enter a valid License Key.' };
    }

    const key = licenseKeyInput.trim();

    try {
      const org = await this.prisma.organization.findUnique({
        where: { licenseKey: key },
      });

      if (!org) {
        return {
          success: false,
          message: 'Invalid License Key. Company not found.',
        };
      }

      // Check if verified boolean is true
      if (!org.isVerified) {
        return {
          success: false,
          message: `Company "${org.name}" is currently pending verification. System administrators will review and verify your request within 1–2 hours.`,
        };
      }

      // Save locally
      this.setStoredLicenseKey(key);

      return {
        success: true,
        tenant: {
          id: org.id,
          name: org.name,
          companyCode: org.companyCode,
          licenseKey: org.licenseKey,
          isVerified: org.isVerified,
        },
      };
    } catch (err: any) {
      console.error('TenantService.validateAndSetLicenseKey error:', err);
      return {
        success: false,
        message: 'Unable to verify license key due to network or database error.',
      };
    }
  }

  /**
   * Get active bound Organization for this desktop instance
   */
  async getActiveTenant(): Promise<TenantResponse> {
    const key = this.getStoredLicenseKey();
    if (!key) {
      return { success: false, message: 'No company license key configured.' };
    }

    try {
      const org = await this.prisma.organization.findUnique({
        where: { licenseKey: key },
      });

      if (!org || !org.isVerified) {
        this.clearLicenseKey();
        return { success: false, message: 'Saved license key is invalid or pending verification.' };
      }

      return {
        success: true,
        tenant: {
          id: org.id,
          name: org.name,
          companyCode: org.companyCode,
          licenseKey: org.licenseKey,
          isVerified: org.isVerified,
        },
      };
    } catch (err) {
      console.error('TenantService.getActiveTenant error:', err);
      return { success: false, message: 'Error checking active tenant.' };
    }
  }

  /**
   * Search VERIFIED companies by name or companyCode
   * ONLY displays organizations where isVerified === true
   */
  async searchOrganizations(queryStr: string): Promise<TenantResponse> {
    try {
      if (!queryStr || !queryStr.trim()) {
        return { success: true, data: [] };
      }

      const q = queryStr.trim().toLowerCase();

      const orgs = await this.prisma.organization.findMany({
        where: {
          isVerified: true, // Only show verified companies in search
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { companyCode: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          companyCode: true,
          licenseKey: true,
          isVerified: true,
        },
        take: 5,
      });

      return { success: true, data: orgs };
    } catch (err: any) {
      console.error('TenantService.searchOrganizations error:', err);
      return { success: false, message: 'Error searching company database.' };
    }
  }

  /**
   * Register a new Company Tenant and License Key
   * Sets isVerified: false by default (requires admin manual DB verification)
   */
  async registerOrganization(input: {
    name: string;
    companyCode: string;
    licenseKey: string;
    adminUserId?: string;
    adminPassword?: string;
  }): Promise<TenantResponse> {
    const { name, companyCode, licenseKey, adminUserId, adminPassword } = input || {};

    if (!name || !name.trim() || !companyCode || !companyCode.trim() || !licenseKey || !licenseKey.trim()) {
      return { success: false, message: 'Company Name, Code, and License Key are required.' };
    }

    const trimmedName = name.trim();
    const trimmedCode = companyCode.trim().toLowerCase().replace(/\s+/g, '-');
    const trimmedKey = licenseKey.trim().toUpperCase();

    try {
      // Check code or key uniqueness
      const existingCode = await this.prisma.organization.findUnique({ where: { companyCode: trimmedCode } });
      if (existingCode) {
        return { success: false, message: `Company Code "${trimmedCode}" is already taken.` };
      }

      const existingKey = await this.prisma.organization.findUnique({ where: { licenseKey: trimmedKey } });
      if (existingKey) {
        return { success: false, message: `License Key "${trimmedKey}" is already registered.` };
      }

      // Create new organization with isVerified: false (pending approval)
      const newOrg = await this.prisma.organization.create({
        data: {
          name: trimmedName,
          companyCode: trimmedCode,
          licenseKey: trimmedKey,
          isVerified: false, // Pending admin manual verification
        },
      });

      // Create default SystemConfig
      await this.prisma.systemConfig.create({
        data: {
          organizationId: newOrg.id,
          lateEntryTime: '09:00',
          earlyExitTime: '17:00',
        },
      });

      // Create default admin user
      const defaultAdminId = adminUserId && adminUserId.trim() ? adminUserId.trim() : 'admin';
      const defaultPassword = adminPassword && adminPassword.trim() ? adminPassword.trim() : 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await this.prisma.user.create({
        data: {
          organizationId: newOrg.id,
          userId: defaultAdminId,
          name: `${trimmedName} Admin`,
          passwordHash,
          role: Role.ADMIN,
        },
      });

      return {
        success: true,
        message: `Company "${newOrg.name}" registration submitted! Your License Key is: ${newOrg.licenseKey}. It will take between 1–2 hours for system administrators to review and verify your license.`,
        tenant: {
          id: newOrg.id,
          name: newOrg.name,
          companyCode: newOrg.companyCode,
          licenseKey: newOrg.licenseKey,
          isVerified: newOrg.isVerified,
        },
      };
    } catch (err: any) {
      console.error('TenantService.registerOrganization error:', err);
      return { success: false, message: err?.message || 'Failed to register company license.' };
    }
  }
}
