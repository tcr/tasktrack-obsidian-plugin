const Logger = {
  log(..._args: unknown[]): void {
    // console.log(...args);
  },

  info(..._args: unknown[]): void {
    // console.info(...args);
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

  trace(..._args: unknown[]): void {
    // console.trace(...args);
  },

  assert(_condition: boolean, ..._args: unknown[]): void {
    // console.assert(condition, ...args);
  },
};

export default Logger;
