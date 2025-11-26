import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { RequiredPermission } from '../decorators/permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;

    const mockMainUser = {
      mainUser: true,
      permissions: {},
    };

    const mockRegularUser = {
      mainUser: false,
      permissions: {
        registration: {
          animals: {
            view: true,
            add: false,
            edit: true,
            remove: false,
          },
        },
        records: {
          health: {
            view: true,
            add: true,
            edit: true,
            remove: false,
          },
        },
      },
    };

    beforeEach(() => {
      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: mockRegularUser,
        }),
      });
    });

    it('should allow access when no permissions or mainUser requirement', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // requiredPermissions
        .mockReturnValueOnce(undefined); // requireMainUser

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access for main users regardless of permissions', () => {
      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: mockMainUser,
        }),
      });

      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'remove' },
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access when main user is required but user is not main user', () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(undefined) // requiredPermissions
        .mockReturnValueOnce(true); // requireMainUser

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should allow access when user has required permissions', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' },
        { section: 'records', resource: 'health', action: 'add' },
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required permissions', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'remove' }, // user has false
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should deny access when user permissions are null', () => {
      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: {
            mainUser: false,
            permissions: null,
          },
        }),
      });

      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' },
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should deny access when required section does not exist', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'nonexistent', resource: 'animals', action: 'view' },
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should deny access when required resource does not exist', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'nonexistent', action: 'view' },
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle multiple permission requirements correctly', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' }, // true
        { section: 'registration', resource: 'animals', action: 'edit' }, // true
        { section: 'records', resource: 'health', action: 'view' }, // true
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should fail when any permission requirement is not met', () => {
      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' }, // true
        { section: 'registration', resource: 'animals', action: 'remove' }, // false
      ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredPermissions)
        .mockReturnValueOnce(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should return true when all permissions are granted', () => {
      const userPermissions = {
        registration: {
          animals: {
            view: true,
            add: true,
          },
        },
      };

      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' },
        { section: 'registration', resource: 'animals', action: 'add' },
      ];

      const result = guard['checkPermissions'](
        userPermissions,
        requiredPermissions,
      );

      expect(result).toBe(true);
    });

    it('should return false when any permission is denied', () => {
      const userPermissions = {
        registration: {
          animals: {
            view: true,
            add: false,
          },
        },
      };

      const requiredPermissions: RequiredPermission[] = [
        { section: 'registration', resource: 'animals', action: 'view' },
        { section: 'registration', resource: 'animals', action: 'add' },
      ];

      const result = guard['checkPermissions'](
        userPermissions,
        requiredPermissions,
      );

      expect(result).toBe(false);
    });
  });
});
