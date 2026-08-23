const winston = require('winston');
require('winston-daily-rotate-file');

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

const successTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/success-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: 'info'
});

const errorTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    level: 'error'
});

const debugTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/debug-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: fileFormat,
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