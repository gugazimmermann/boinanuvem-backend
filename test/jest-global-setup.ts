/**
 * Global setup that runs once before all test workers
 * This patches setInterval globally to unref all intervals
 * to prevent prom-client intervals from keeping workers alive
 */

// Patch setInterval BEFORE any modules are loaded
// This ensures prom-client's intervals are automatically unref'd
const originalSetInterval = global.setInterval;
global.setInterval = function (
  callback: any,
  delay?: number,
  ...args: any[]
): NodeJS.Timeout {
  const interval = originalSetInterval(callback, delay, ...args);
  // Automatically unref all intervals so they don't keep the process alive
  interval.unref();
  return interval;
};

export default async function globalSetup(): Promise<void> {
  // This runs once before all tests
  // The setInterval patch above runs when this module is loaded
}
