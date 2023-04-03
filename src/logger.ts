import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG ?? 'info',
  format: format.combine(format.colorize(), format.simple()),
  // transports: [
  //   new transports.File({
  //     filename: 'logs/error.log',
  //     level: 'error',
  //     format: format.json(),
  //   }),
  //   new transports.File({
  //     filename: 'logs/combined.log',
  //     format: format.json(),
  //   }),
  // ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.simple(),
    })
  );
}

export default logger;
