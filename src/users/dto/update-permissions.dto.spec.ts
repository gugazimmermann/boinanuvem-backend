import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePermissionsDto } from './update-permissions.dto';

describe('UpdatePermissionsDto', () => {
  const createValidPermissions = () => ({
    registration: {
      property: { view: true, add: false, edit: false, remove: false },
      location: { view: true, add: false, edit: false, remove: false },
      employee: { view: true, add: false, edit: false, remove: false },
      serviceProvider: { view: true, add: false, edit: false, remove: false },
      supplier: { view: true, add: false, edit: false, remove: false },
      buyer: { view: true, add: false, edit: false, remove: false },
      inventory: { view: true, add: false, edit: false, remove: false },
      animals: { view: true, add: false, edit: false, remove: false },
    },
    records: {
      births: { view: true, add: false, edit: false, remove: false },
      acquisitions: { view: true, add: false, edit: false, remove: false },
      weighings: { view: true, add: false, edit: false, remove: false },
      sales: { view: true, add: false, edit: false, remove: false },
      deaths: { view: true, add: false, edit: false, remove: false },
      sanitaryControls: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      locationMovements: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      animalMovements: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
    },
    breedings: {
      breedings: { view: true, add: false, edit: false, remove: false },
      unconfirmedBreedings: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      pregnantCows: { view: true, add: false, edit: false, remove: false },
      reproductiveIndexes: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      birthForecast: { view: true, add: false, edit: false, remove: false },
    },
    finances: {
      cashFlow: { view: true, add: false, edit: false, remove: false },
      accountsPayable: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      accountsReceivable: {
        view: true,
        add: false,
        edit: false,
        remove: false,
      },
      bankAccounts: { view: true, add: false, edit: false, remove: false },
    },
  });

  describe('ResourcePermissions', () => {
    it('should validate all boolean fields', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: true, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-boolean values for view', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: {
            view: 'not-boolean',
            add: true,
            edit: false,
            remove: false,
          },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-boolean values for add', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: {
            view: true,
            add: 'not-boolean',
            edit: false,
            remove: false,
          },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-boolean values for edit', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: {
            view: true,
            add: true,
            edit: 'not-boolean',
            remove: false,
          },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-boolean values for remove', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: {
            view: true,
            add: true,
            edit: true,
            remove: 'not-boolean',
          },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RegistrationPermissions', () => {
    it('should validate all registration resources', async () => {
      const validPermissions = createValidPermissions();
      const dto = plainToInstance(UpdatePermissionsDto, validPermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate property permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate location permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          location: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate employee permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          employee: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate serviceProvider permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          serviceProvider: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate supplier permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          supplier: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate buyer permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          buyer: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate inventory permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          inventory: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate animals permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          animals: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('RecordsPermissions', () => {
    it('should validate all records resources', async () => {
      const validPermissions = createValidPermissions();
      const dto = plainToInstance(UpdatePermissionsDto, validPermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate births permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate acquisitions permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          acquisitions: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate weighings permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          weighings: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate sales permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          sales: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate deaths permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          deaths: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate sanitaryControls permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          sanitaryControls: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate locationMovements permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          locationMovements: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate animalMovements permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          animalMovements: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('BreedingsPermissions', () => {
    it('should validate all breedings resources', async () => {
      const validPermissions = createValidPermissions();
      const dto = plainToInstance(UpdatePermissionsDto, validPermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate breedings permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: true, edit: true, remove: true },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate unconfirmedBreedings permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          unconfirmedBreedings: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate pregnantCows permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          pregnantCows: { view: true, add: true, edit: true, remove: true },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate reproductiveIndexes permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          reproductiveIndexes: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate birthForecast permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          birthForecast: { view: true, add: true, edit: true, remove: true },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('FinancesPermissions', () => {
    it('should validate all finances resources', async () => {
      const validPermissions = createValidPermissions();
      const dto = plainToInstance(UpdatePermissionsDto, validPermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate cashFlow permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: true, edit: true, remove: true },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate accountsPayable permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          accountsPayable: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate accountsReceivable permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          accountsReceivable: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate bankAccounts permissions', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          bankAccounts: { view: true, add: true, edit: true, remove: true },
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdatePermissionsDto', () => {
    it('should validate complete permissions structure', async () => {
      const validPermissions = createValidPermissions();
      const dto = plainToInstance(UpdatePermissionsDto, validPermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing registration section', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing records section', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing breedings section', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing finances section', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object registration', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: 'not-an-object',
        records: {
          births: { view: true, add: false, edit: false, remove: false },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object records', async () => {
      const dto = plainToInstance(UpdatePermissionsDto, {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
        },
        records: 'not-an-object',
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
        },
        finances: {
          cashFlow: { view: true, add: false, edit: false, remove: false },
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle all permissions set to true', async () => {
      const allTruePermissions = {
        registration: {
          property: { view: true, add: true, edit: true, remove: true },
          location: { view: true, add: true, edit: true, remove: true },
          employee: { view: true, add: true, edit: true, remove: true },
          serviceProvider: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          supplier: { view: true, add: true, edit: true, remove: true },
          buyer: { view: true, add: true, edit: true, remove: true },
          inventory: { view: true, add: true, edit: true, remove: true },
          animals: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: true, edit: true, remove: true },
          acquisitions: { view: true, add: true, edit: true, remove: true },
          weighings: { view: true, add: true, edit: true, remove: true },
          sales: { view: true, add: true, edit: true, remove: true },
          deaths: { view: true, add: true, edit: true, remove: true },
          sanitaryControls: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          locationMovements: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          animalMovements: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
        },
        breedings: {
          breedings: { view: true, add: true, edit: true, remove: true },
          unconfirmedBreedings: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          pregnantCows: { view: true, add: true, edit: true, remove: true },
          reproductiveIndexes: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          birthForecast: { view: true, add: true, edit: true, remove: true },
        },
        finances: {
          cashFlow: { view: true, add: true, edit: true, remove: true },
          accountsPayable: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          accountsReceivable: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          bankAccounts: { view: true, add: true, edit: true, remove: true },
        },
      };

      const dto = plainToInstance(UpdatePermissionsDto, allTruePermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle all permissions set to false', async () => {
      const allFalsePermissions = {
        registration: {
          property: { view: false, add: false, edit: false, remove: false },
          location: { view: false, add: false, edit: false, remove: false },
          employee: { view: false, add: false, edit: false, remove: false },
          serviceProvider: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          supplier: { view: false, add: false, edit: false, remove: false },
          buyer: { view: false, add: false, edit: false, remove: false },
          inventory: { view: false, add: false, edit: false, remove: false },
          animals: { view: false, add: false, edit: false, remove: false },
        },
        records: {
          births: { view: false, add: false, edit: false, remove: false },
          acquisitions: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          weighings: { view: false, add: false, edit: false, remove: false },
          sales: { view: false, add: false, edit: false, remove: false },
          deaths: { view: false, add: false, edit: false, remove: false },
          sanitaryControls: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          locationMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          animalMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        breedings: {
          breedings: { view: false, add: false, edit: false, remove: false },
          unconfirmedBreedings: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          pregnantCows: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          reproductiveIndexes: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          birthForecast: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        finances: {
          cashFlow: { view: false, add: false, edit: false, remove: false },
          accountsPayable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          accountsReceivable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          bankAccounts: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
      };

      const dto = plainToInstance(UpdatePermissionsDto, allFalsePermissions);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
