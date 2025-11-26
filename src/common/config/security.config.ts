import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE ?? '31536000', 10),
      includeSubDomains: true,
      preload: true,
    },
  },
  request: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT ?? '30000', 10),
    maxSize: process.env.MAX_REQUEST_SIZE ?? '10mb',
  },
}));
