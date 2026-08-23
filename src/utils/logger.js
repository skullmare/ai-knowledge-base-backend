const winston = require('winston');
require('winston-daily-rotate-file');

const { env } = require('../../config/env');

const { combine, timestamp, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, statusCode, details }) => {
    let logMessage = `${timestamp} [${level}]`;
    
    if (statusCode) {
        logMessage += ` [Status: ${statusCode}]`;
    }
    
    logMessage += ` Message: ${message}`;
    
    if (details) {
        logMessage += ` [${details}]`;
    }
    
    return logMessage;
});

const fileFormat = combine(
    timestamp(),
    json()
);

const createFileTransport = (options) => new winston.transports.DailyRotateFile({
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    format: fileFormat,
    silent: env.isTest,
    ...options
});

const successTransport = createFileTransport({
    filename: 'logs/success-%DATE%.log',
    maxFiles: '14d',
    level: 'info'
});

const errorTransport = createFileTransport({
    filename: 'logs/error-%DATE%.log',
    maxFiles: '30d',
    level: 'error'
});

const debugTransport = createFileTransport({
    filename: 'logs/debug-%DATE%.log',
    maxFiles: '7d',
    level: 'debug'
});

const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize({ all: true }),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                consoleFormat
            )
        }),
        successTransport,
        errorTransport,
        debugTransport
    ],
    // В тестах логи только зашумляют вывод и плодят файлы в logs/.
    silent: env.isTest,
    exitOnError: false
});

const logger = {
    success: (message, statusCode = null, details = null) => {
        winstonLogger.info(message, { 
            statusCode,
            details,
            type: 'SUCCESS'
        });
    },

    error: (message, statusCode = null, details = null) => {
        winstonLogger.error(message, { 
            statusCode,
            details,
            type: 'ERROR'
        });
    },

    debug: (message, details = null) => {
        winstonLogger.debug(message, { 
            details,
            type: 'DEBUG'
        });
    },

    warn: (message, statusCode = null, details = null) => {
        winstonLogger.warn(message, { 
            statusCode,
            details,
            type: 'WARNING'
        });
    }
};

module.exports = logger;