/**
 * Global setup file for Jest tests
 * This file runs before all tests and sets up proper test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_SWAGGER = 'false';
process.env.RATE_LIMIT_TTL = '60000';
process.env.RATE_LIMIT_MAX = '1000'; // Higher limit for testing

// Patch setInterval to automatically unref all intervals in test mode
// This prevents intervals (like those from prom-client) from keeping the process alive
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

// Also patch setTimeout for consistency
const originalSetTimeout = global.setTimeout;
global.setTimeout = function (
  callback: any,
  delay?: number,
  ...args: any[]
): NodeJS.Timeout {
  const timeout = originalSetTimeout(callback, delay, ...args);
  // Note: We don't unref setTimeout as it might be needed for test timeouts
  // But we can unref it if it's a long delay (more than 1 second)
  if (delay && delay > 1000) {
    timeout.unref();
  }
  return timeout;
};

// Track all prom-client collectors to stop them later
const promClientCollectors: Set<any> = new Set();

// Track all TestingModule instances
const createdModules: Set<any> = new Set();

// Intercept prom-client's collectDefaultMetrics to track collectors
try {
  const promClient = require('prom-client');
  const originalCollectDefaultMetrics = promClient.collectDefaultMetrics;

  if (originalCollectDefaultMetrics) {
    promClient.collectDefaultMetrics = function (...args: any[]) {
      const collector = originalCollectDefaultMetrics.apply(this, args);
      if (collector) {
        promClientCollectors.add(collector);
      }
      return collector;
    };
  }
} catch {
  // prom-client might not be available
}

// Monkey-patch Test.createTestingModule to track modules
try {
  const Test = require('@nestjs/testing').Test;
  const originalMethod = Test.createTestingModule;

  Test.createTestingModule = function (...args: any[]) {
    const moduleBuilder = originalMethod.apply(this, args);
    const originalCompile = moduleBuilder.compile.bind(moduleBuilder);

    moduleBuilder.compile = async function () {
      const module = await originalCompile();
      createdModules.add(module);

      // Override close to remove from tracking
      const originalClose = module.close.bind(module);
      module.close = async function () {
        createdModules.delete(module);
        return originalClose();
      };

      return module;
    };

    return moduleBuilder;
  };
} catch {
  // NestJS testing might not be available
}

// Aggressive cleanup after all tests
afterAll(async () => {
  // First, stop all prom-client collectors
  for (const collector of promClientCollectors) {
    try {
      if (collector && typeof collector.stop === 'function') {
        collector.stop();
      }
      // Also try to clear any intervals directly
      if (collector) {
        const collectorInternal = collector as any;
        if (collectorInternal._interval) {
          try {
            clearInterval(collectorInternal._interval);
          } catch {
            // Ignore
          }
        }
        // Try to access nested intervals
        if (collectorInternal._collectors) {
          for (const nestedCollector of collectorInternal._collectors || []) {
            if (nestedCollector && nestedCollector._interval) {
              try {
                clearInterval(nestedCollector._interval);
              } catch {
                // Ignore
              }
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  promClientCollectors.clear();

  // Clear all prom-client registries and stop all collectors
  try {
    const promClient = require('prom-client');
    if (promClient.register) {
      // Clear the registry
      if (typeof promClient.register.clear === 'function') {
        promClient.register.clear();
      }

      // Access internal state to stop all collectors
      const registryInternal = promClient.register as any;
      if (
        registryInternal._collectors &&
        Array.isArray(registryInternal._collectors)
      ) {
        for (const collector of registryInternal._collectors) {
          try {
            if (collector && typeof collector.stop === 'function') {
              collector.stop();
            }
            if (collector && collector._interval) {
              clearInterval(collector._interval);
            }
          } catch {
            // Ignore
          }
        }
      }

      // Also try to stop default metrics if stored separately
      if (registryInternal._defaultMetrics) {
        const defaultMetrics = registryInternal._defaultMetrics;
        try {
          if (defaultMetrics && typeof defaultMetrics.stop === 'function') {
            defaultMetrics.stop();
          }
          if (defaultMetrics && defaultMetrics._interval) {
            clearInterval(defaultMetrics._interval);
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore errors
  }

  // Close all tracked modules
  const modulesToClose = Array.from(createdModules);
  for (const module of modulesToClose) {
    try {
      if (module && typeof module.close === 'function') {
        await module.close();
      }
    } catch {
      // Ignore errors
    }
  }
  createdModules.clear();

  // Force stop ALL remaining timer handles
  // This is the nuclear option to ensure nothing keeps the process alive
  try {
    const processInternal = process as any;
    if (typeof processInternal._getActiveHandles === 'function') {
      const handles = processInternal._getActiveHandles();
      for (const handle of handles) {
        if (handle) {
          const handleType = handle.constructor?.name || '';
          // Stop all timer types
          if (handleType === 'Timeout' || handleType === 'Immediate') {
            try {
              // Try multiple methods to clear
              if (handle.refresh) {
                clearTimeout(handle);
              } else {
                clearTimeout(handle);
              }
              // Also try to unref if possible
              if (handle.unref && typeof handle.unref === 'function') {
                handle.unref();
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    // Also try to get active requests and clear them
    if (typeof processInternal._getActiveRequests === 'function') {
      const requests = processInternal._getActiveRequests();
      for (const request of requests) {
        try {
          if (request && typeof request.destroy === 'function') {
            request.destroy();
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore errors
  }

  // Give event loop a chance to process cleanup
  await new Promise((resolve) => setImmediate(resolve));

  // Final nuclear option: Clear ALL remaining intervals
  // This finds and clears any intervals that are still running
  try {
    // Use a more aggressive approach - clear all active handles
    const processInternal = process as any;

    // Get all active handles multiple times to catch any that were created during cleanup
    for (let i = 0; i < 3; i++) {
      if (typeof processInternal._getActiveHandles === 'function') {
        const handles = processInternal._getActiveHandles();
        let cleared = 0;
        for (const handle of handles) {
          if (handle) {
            const handleType = handle.constructor?.name || '';
            if (handleType === 'Timeout') {
              try {
                clearTimeout(handle);
                cleared++;
              } catch {
                // Ignore
              }
            }
          }
        }
        // If we cleared some, wait a bit and check again
        if (cleared > 0) {
          await new Promise((resolve) => setImmediate(resolve));
        } else {
          break;
        }
      }
    }
  } catch {
    // Ignore errors
  }
});
