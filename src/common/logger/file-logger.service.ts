import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logsDir: string;
  private readonly maxFileSize = 10 * 1024 * 1024;
  private readonly maxFiles = 5;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFileName(level: string): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `${level}-${date}.log`);
  }

  private writeToFile(level: string, message: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      context: context || 'Application',
      message: typeof message === 'object' ? message : message,
      pid: process.pid,
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const fileName = this.getLogFileName(level);

    try {
      if (fs.existsSync(fileName)) {
        const stats = fs.statSync(fileName);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(fileName, level);
        }
      }

      fs.appendFileSync(fileName, logLine);

      this.writeToCombinedLog(logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToCombinedLog(logEntry: Record<string, unknown>): void {
    const date = new Date().toISOString().split('T')[0];
    const combinedFileName = path.join(this.logsDir, `combined-${date}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(combinedFileName, logLine);
    } catch {
      // Silently ignore errors when writing to combined log
    }
  }

  private rotateLogFile(fileName: string, level: string): void {
    const date = new Date().toISOString().split('T')[0];
    const baseName = path.join(this.logsDir, `${level}-${date}`);

    let rotationNumber = 1;
    while (
      fs.existsSync(`${baseName}.${rotationNumber}.log`) &&
      rotationNumber < this.maxFiles
    ) {
      rotationNumber++;
    }

    if (rotationNumber < this.maxFiles) {
      fs.renameSync(fileName, `${baseName}.${rotationNumber}.log`);
    } else {
      for (let i = 1; i < this.maxFiles; i++) {
        const oldFile = `${baseName}.${i + 1}.log`;
        const newFile = `${baseName}.${i}.log`;
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }
      fs.renameSync(fileName, `${baseName}.${this.maxFiles}.log`);
    }
  }

  log(message: unknown, context?: string): void {
    if (this.shouldShowInConsole(message, context)) {
      console.log(
        `[${context || 'LOG'}]`,
        typeof message === 'object' ? JSON.stringify(message) : message,
      );
    }
    this.writeToFile('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    const errorLog = {
      message,
      trace,
    };
    console.error(
      `[${context || 'ERROR'}]`,
      typeof message === 'object' ? JSON.stringify(message) : message,
    );
    this.writeToFile('error', errorLog, context);
  }

  warn(message: unknown, context?: string): void {
    console.warn(
      `[${context || 'WARN'}]`,
      typeof message === 'object' ? JSON.stringify(message) : message,
    );
    this.writeToFile('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.writeToFile('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.writeToFile('verbose', message, context);
  }

  private shouldShowInConsole(message: unknown, context?: string): boolean {
    const criticalContexts = ['Bootstrap', 'NestApplication'];
    const criticalMessages = [
      'Starting Nest application',
      'Nest application successfully started',
      'Application is running on',
      'Health checks available at',
      'Metrics available at',
      'Swagger documentation available at',
    ];

    if (criticalContexts.includes(context || '')) {
      return true;
    }

    const messageStr =
      typeof message === 'object' && message !== null
        ? JSON.stringify(message)
        : String(message);
    return criticalMessages.some((critical) => messageStr.includes(critical));
  }

  // setLogLevels method is optional and not needed for this implementation
}
