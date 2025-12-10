import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from './permissions.decorator';
import { AnimalsController } from '../../animals/animals.controller';
import { BirthsController } from '../../births/births.controller';
import { AcquisitionsController } from '../../acquisitions/acquisitions.controller';

describe('Permission Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('AnimalsController permissions', () => {
    it('should have correct permission resource name for create', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AnimalsController.prototype.create,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'registration',
        resource: 'animals',
        action: 'add',
      });
    });

    it('should have correct permission resource name for findAll', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AnimalsController.prototype.findAll,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'registration',
        resource: 'animals',
        action: 'view',
      });
    });

    it('should have correct permission resource name for findOne', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AnimalsController.prototype.findOne,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'registration',
        resource: 'animals',
        action: 'view',
      });
    });

    it('should have correct permission resource name for update', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AnimalsController.prototype.update,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'registration',
        resource: 'animals',
        action: 'edit',
      });
    });

    it('should have correct permission resource name for remove', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AnimalsController.prototype.remove,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'registration',
        resource: 'animals',
        action: 'remove',
      });
    });
  });

  describe('BirthsController permissions', () => {
    it('should have correct permission resource name for create', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.create,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'add',
      });
    });

    it('should have correct permission resource name for findAll', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.findAll,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'view',
      });
    });

    it('should have correct permission resource name for findOne', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.findOne,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'view',
      });
    });

    it('should have correct permission resource name for findByAnimalId', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.findByAnimalId,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'view',
      });
    });

    it('should have correct permission resource name for update', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.update,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'edit',
      });
    });

    it('should have correct permission resource name for remove', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        BirthsController.prototype.remove,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'births',
        action: 'remove',
      });
    });
  });

  describe('AcquisitionsController permissions', () => {
    it('should have correct permission resource name for create', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.create,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'add',
      });
    });

    it('should have correct permission resource name for findAll', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.findAll,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'view',
      });
    });

    it('should have correct permission resource name for findOne', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.findOne,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'view',
      });
    });

    it('should have correct permission resource name for findByAnimalId', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.findByAnimalId,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'view',
      });
    });

    it('should have correct permission resource name for update', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.update,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'edit',
      });
    });

    it('should have correct permission resource name for remove', () => {
      const permissions = reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        AcquisitionsController.prototype.remove,
      );
      expect(permissions).toBeDefined();
      expect(permissions?.[0]).toEqual({
        section: 'records',
        resource: 'acquisitions',
        action: 'remove',
      });
    });
  });
});
