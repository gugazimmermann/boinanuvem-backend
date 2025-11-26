import { Test, TestingModule } from '@nestjs/testing';
import { FileLoggerService } from './file-logger.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileLoggerService', () => {
  let service: FileLoggerService;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock fs methods
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation();
    mockFs.appendFileSync.mockImplementation();
    mockFs.statSync.mockReturnValue({ size: 1024 } as fs.Stats);
    mockFs.renameSync.mockImplementation();

    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileLoggerService],
    }).compile();

    service = module.get<FileLoggerService>(FileLoggerService);
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create logs directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      new FileLoggerService();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'logs'),
        { recursive: true },
      );
    });

    it('should not create logs directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      new FileLoggerService();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should write info log to file', () => {
      const message = 'Test log message';
      const context = 'TestContext';

      service.log(message, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });

    it('should show critical messages in console', () => {
      const message = 'Starting Nest application';
      const context = 'Bootstrap';

      service.log(message, context);

      expect(consoleSpy.log).toHaveBeenCalledWith('[Bootstrap]', message);
    });

    it('should not show non-critical messages in console', () => {
      const message = 'Regular log message';
      const context = 'RegularContext';

      service.log(message, context);

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should handle object messages', () => {
      const message = { key: 'value', number: 42 };
      const context = 'TestContext';

      service.log(message, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should write error log to file with trace', () => {
      const message = 'Test error message';
      const trace = 'Error stack trace';
      const context = 'ErrorContext';

      service.error(message, trace, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ErrorContext]', message);
    });

    it('should handle error without context', () => {
      const message = 'Test error message';

      service.error(message);

      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', message);
    });

    it('should handle object error messages', () => {
      const message = { error: 'Something went wrong', code: 500 };

      service.error(message);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ERROR]',
        JSON.stringify(message),
      );
    });
  });

  describe('warn', () => {
    it('should write warning log to file', () => {
      const message = 'Test warning message';
      const context = 'WarnContext';

      service.warn(message, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WarnContext]', message);
    });

    it('should handle warning without context', () => {
      const message = 'Test warning message';

      service.warn(message);

      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN]', message);
    });
  });

  describe('debug', () => {
    it('should write debug log to file without console output', () => {
      const message = 'Test debug message';
      const context = 'DebugContext';

      service.debug(message, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should write verbose log to file without console output', () => {
      const message = 'Test verbose message';
      const context = 'VerboseContext';

      service.verbose(message, context);

      expect(mockFs.appendFileSync).toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('file rotation', () => {
    it('should rotate log file when size exceeds limit', () => {
      // Mock large file size
      mockFs.statSync.mockReturnValue({ size: 15 * 1024 * 1024 } as fs.Stats);

      service.log('Test message');

      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should not rotate log file when size is within limit', () => {
      // Mock small file size
      mockFs.statSync.mockReturnValue({ size: 1024 } as fs.Stats);

      service.log('Test message');

      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should handle rotation when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      service.log('Test message');

      expect(mockFs.statSync).not.toHaveBeenCalled();
      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });
  });

  describe('nullish coalescing behavior', () => {
    it('should handle undefined context with nullish coalescing in critical context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.log('Test message', 'Bootstrap'); // Critical context

      expect(consoleSpy).toHaveBeenCalledWith('[Bootstrap]', 'Test message');

      consoleSpy.mockRestore();
    });

    it('should handle null context with nullish coalescing in critical context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.log('Test message', null as any);

      // Should not show in console for null context (not critical)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should preserve empty string context with nullish coalescing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.log('Test message', '');

      // Should not show in console for empty context (not critical)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use default context for undefined in file writing', () => {
      // Test that the nullish coalescing works in the writeToFile method
      service.log('Test message', undefined);

      // Verify file was written with default context
      expect(mockFs.appendFileSync).toHaveBeenCalled();
      const writeCall = mockFs.appendFileSync.mock.calls[0];
      const logData = JSON.parse(writeCall[1] as string);
      expect(logData.context).toBe('Application');
    });
  });

  describe('error handling', () => {
    it('should handle file write errors gracefully', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        service.log('Test message');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log file:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle combined log write errors silently', () => {
      let callCount = 0;
      mockFs.appendFileSync.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call is for combined log
          throw new Error('Combined log write error');
        }
      });

      expect(() => {
        service.log('Test message');
      }).not.toThrow();
    });
  });

  describe('shouldShowInConsole', () => {
    it('should show messages from critical contexts', () => {
      service.log('Any message', 'Bootstrap');
      expect(consoleSpy.log).toHaveBeenCalled();

      consoleSpy.log.mockClear();
      service.log('Any message', 'NestApplication');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should show critical messages regardless of context', () => {
      service.log('Nest application successfully started', 'SomeContext');
      expect(consoleSpy.log).toHaveBeenCalled();

      consoleSpy.log.mockClear();
      service.log('Health checks available at', 'SomeContext');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not show non-critical messages from non-critical contexts', () => {
      service.log('Regular message', 'RegularContext');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should handle null message objects', () => {
      service.log(null, 'TestContext');
      expect(mockFs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('log file naming', () => {
    it('should create log files with date-based names', () => {
      const today = new Date().toISOString().split('T')[0];

      service.log('Test message');

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`info-${today}.log`),
        expect.any(String),
      );
    });

    it('should create separate files for different log levels', () => {
      service.error('Error message');
      service.warn('Warning message');
      service.debug('Debug message');

      const today = new Date().toISOString().split('T')[0];

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`error-${today}.log`),
        expect.any(String),
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`warn-${today}.log`),
        expect.any(String),
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`debug-${today}.log`),
        expect.any(String),
      );
    });
  });
});
