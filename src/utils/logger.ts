type LogLevel = 'debug' | 'verbose' | 'trace' | 'info' | 'warning' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  verbose: 1,
  trace: 2,
  info: 3,
  warning: 4,
  error: 5,
};

class Logger {
  private level: LogLevel;
  private debugEnabled: boolean;

  constructor() {
    this.debugEnabled = process.env.DEBUG === 'true';
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'debug' && !this.debugEnabled) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.shouldLog('verbose')) {
      console.log(this.formatMessage('verbose', message), ...args);
    }
  }

  trace(message: string, ...args: any[]): void {
    if (this.shouldLog('trace')) {
      console.log(this.formatMessage('trace', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warning(message: string, ...args: any[]): void {
    if (this.shouldLog('warning')) {
      console.warn(this.formatMessage('warning', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }
}

export const logger = new Logger();
