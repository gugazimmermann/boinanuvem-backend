/**
 * Global teardown for Jest tests
 * Ensures all Prisma connections, prom-client metrics, and other resources are properly closed
 *
 * Note: Despite our best efforts to stop prom-client intervals, Jest may still need forceExit: true
 * because prom-client's collectDefaultMetrics() creates intervals that are difficult to fully stop.
 * This is a known limitation when using prom-client with Jest.
 */
export default async function globalTeardown(): Promise<void> {
  // Stop prom-client default metrics collection
  // This is critical as collectDefaultMetrics() creates intervals that keep the process alive
  try {
    const promClient = await import('prom-client');

    // Clear the default registry
    if (
      promClient.register &&
      typeof promClient.register.clear === 'function'
    ) {
      promClient.register.clear();
    }

    // Try to stop all collectors in the default registry
    try {
      const defaultRegistry = promClient.register as any;

      // Access internal collectors array
      if (
        defaultRegistry._collectors &&
        Array.isArray(defaultRegistry._collectors)
      ) {
        for (const collector of defaultRegistry._collectors) {
          if (collector && typeof collector.stop === 'function') {
            try {
              collector.stop();
            } catch {
              // Ignore errors
            }
          }
          // Also try to clear intervals directly
          if (collector && (collector as any)._interval) {
            try {
              clearInterval((collector as any)._interval);
            } catch {
              // Ignore errors
            }
          }
        }
      }

      // Try to access and stop default metrics if stored separately
      if (defaultRegistry._defaultMetrics) {
        const defaultMetrics = defaultRegistry._defaultMetrics;
        if (defaultMetrics && typeof defaultMetrics.stop === 'function') {
          try {
            defaultMetrics.stop();
          } catch {
            // Ignore errors
          }
        }
        if (defaultMetrics && (defaultMetrics as any)._interval) {
          try {
            clearInterval((defaultMetrics as any)._interval);
          } catch {
            // Ignore errors
          }
        }
      }
    } catch {
      // Ignore errors when accessing internal state
    }

    // Force stop all remaining timer handles
    try {
      const processInternal = process as any;
      if (typeof processInternal._getActiveHandles === 'function') {
        const handles = processInternal._getActiveHandles();
        for (const handle of handles) {
          if (handle) {
            const handleType = handle.constructor?.name || '';
            if (handleType === 'Timeout') {
              try {
                clearTimeout(handle);
              } catch {
                // Ignore errors
              }
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }
  } catch {
    // Ignore import errors
  }

  // Force close any remaining Prisma connections
  // This handles cases where tests didn't properly close their modules
  try {
    const { PrismaClient } = await import('@prisma/client');

    // Disconnect any existing Prisma clients
    // Note: This is a best-effort cleanup since we can't track all instances
    const prisma = new PrismaClient();
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors
    }
  } catch {
    // Ignore import errors (Prisma might not be available in all test environments)
  }

  // Give Node.js event loop time to clean up any remaining async operations
  // This helps ensure timers and other async operations complete
  await new Promise((resolve) => {
    setImmediate(() => {
      setImmediate(() => {
        setImmediate(resolve);
      });
    });
  });
}
