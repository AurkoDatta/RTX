/**
 * Minimal timestamped console logger. Kept deliberately thin: this project
 * has no external log aggregation service, so structured console output is
 * sufficient and avoids pulling in a logging framework for a demo-scale app.
 */
export const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR', ...args),
};
