const Logger = {
  log(...args: unknown[]): void {
    console.log(...args);
  },

  info(...args: unknown[]): void {
    console.info(...args);
  },

  warn(...args: unknown[]): void {
    console.warn(...args);
  },

  error(...args: unknown[]): void {
    console.error(...args);
  },

  debug(...args: unknown[]): void {
    console.debug(...args);
  },

  trace(...args: unknown[]): void {
    console.trace(...args);
  },

  assert(condition: boolean, ...args: unknown[]): void {
    console.assert(condition, ...args);
  },
};

export default Logger;
