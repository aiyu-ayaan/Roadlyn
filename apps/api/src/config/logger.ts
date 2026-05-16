import pino from 'pino';
import { config } from './env';

const isDev = config.API_NODE_ENV === 'development';

export const logger = pino({
  level: config.API_LOG_LEVEL,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
