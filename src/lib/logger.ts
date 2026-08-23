import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'url-shortener' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV !== 'production' 
        ? combine(
            colorize(),
            printf(({ level, message, timestamp, ...meta }) => {
              return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            })
          )
        : combine(timestamp(), json())
    })
  ]
});
