import type { CompanyRole } from '@/hooks/useCompany';

export interface Permissions {
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canTransferOwnership: boolean;
  canConnectFortnox: boolean;
  canEditCompanySettings: boolean;
  canDeleteQuotes: boolean;
}

export function getPermissions(role: CompanyRole | null): Permissions {
  const isOwner = role === 'owner';
  const isAdminOrOwner = role === 'owner' || role === 'admin';

  return {
    canInviteMembers: isAdminOrOwner,
    canRemoveMembers: isAdminOrOwner,
    canChangeRoles: isOwner,
    canTransferOwnership: isOwner,
    canConnectFortnox: isAdminOrOwner,
    canEditCompanySettings: isAdminOrOwner,
    canDeleteQuotes: isAdminOrOwner,
  };
}
