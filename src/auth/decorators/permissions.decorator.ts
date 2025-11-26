import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  section: string;
  resource: string;
  action: 'view' | 'add' | 'edit' | 'remove';
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireMainUser = () => SetMetadata('mainUser', true);
