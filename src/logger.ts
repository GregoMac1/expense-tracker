import pino from 'pino';
import { loadConfig } from './config';

const config = loadConfig();
const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: config.LOG_LEVEL,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});
