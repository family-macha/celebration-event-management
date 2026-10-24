/**
 * Minimal structured logger.
 *
 * Field values are restricted to primitives on purpose: it makes it hard to
 * log a request body, a prompt or an error object (and with them, personal
 * data or secrets) by accident. Callers log event names and categories only.
 */

export type LogFields = Readonly<Record<string, string | number | boolean>>;

export interface Logger {
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

function emit(level: 'warn' | 'error', event: string, fields: LogFields | undefined): void {
  const line = JSON.stringify({ level, event, ...fields, at: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else console.warn(line);
}

export const consoleLogger: Logger = {
  warn: (event, fields) => {
    emit('warn', event, fields);
  },
  error: (event, fields) => {
    emit('error', event, fields);
  },
};
