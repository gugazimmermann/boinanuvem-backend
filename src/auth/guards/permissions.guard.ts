import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    const requireMainUser = this.reflector.getAllAndOverride<boolean>(
      'mainUser',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions && !requireMainUser) {
      return true;
    }

    interface RequestWithUser {
      user: {
        mainUser: boolean;
        permissions: Record<string, unknown>;
      };
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    // Main users have access to everything
    if (user.mainUser) {
      return true;
    }

    // If main user is required but user is not main user
    if (requireMainUser && !user.mainUser) {
      return false;
    }

    // Check specific permissions
    if (requiredPermissions && !user.mainUser) {
      return this.checkPermissions(user.permissions, requiredPermissions);
    }

    return true;
  }

  private checkPermissions(
    userPermissions: Record<string, unknown>,
    requiredPermissions: RequiredPermission[],
  ): boolean {
    if (!userPermissions) {
      return false;
    }

    return requiredPermissions.every((permission) => {
      const section = userPermissions[permission.section] as Record<
        string,
        unknown
      >;
      if (!section) return false;

      const resource = section[permission.resource] as Record<string, unknown>;
      if (!resource) return false;

      return resource[permission.action] === true;
    });
  }
}
