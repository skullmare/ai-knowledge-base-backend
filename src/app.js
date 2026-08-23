const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const expressWs = require('express-ws');

const { env } = require('../config/env');
const sendError = require('./utils/error-handler');
const logger = require('./utils/logger');
const { getHocuspocus } = require('./services/init-collaboration');

const routes = {
    '/api/v1/health': require('./routes/health'),
    '/api/v1/auth': require('./routes/auth'),
    '/api/v1/profile': require('./routes/profile'),
    '/api/v1/password': require('./routes/password'),
    '/api/v1/users': require('./routes/platform-user'),
    '/api/v1/topics': require('./routes/topic'),
    '/api/v1/files': require('./routes/file'),
    '/api/v1/platform/roles': require('./routes/platform-role'),
    '/api/v1/topic/categories': require('./routes/topic-category'),
    '/api/v1/logs': require('./routes/log'),
    '/api/v1/agent/roles': require('./routes/agent-role'),
    '/api/v1/agent/users': require('./routes/agent-user'),
    '/api/v1/permissions': require('./routes/permissions'),
    '/api/v1/actions': require('./routes/actions')
};

const app = express();
expressWs(app);

app.set('trust proxy', 1);

app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.ws('/api/v1/collaboration', (ws, req) => {
    const hocuspocus = getHocuspocus();

    if (!hocuspocus) {
        logger.error('[WS] Hocuspocus ещё не инициализирован');
        ws.close(1011, 'Hocuspocus not ready');
        return;
    }

    hocuspocus.handleConnection(ws, req);
});

Object.entries(routes).forEach(([path, router]) => app.use(path, router));

app.use((req, res) => {
    sendError(res, 404, `Маршрут ${req.method} ${req.originalUrl} не найден`);
});

// Обработчик ошибок Express распознаётся только по четырём аргументам —
// сигнатура (err, req, res) превращает его в обычный middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const isClientError = status < 500;
    const message = isClientError
        ? err.message || 'Некорректный запрос'
        : 'Внутренняя ошибка сервера';

    if (!isClientError) logger.error('Необработанная ошибка', status, err.stack || err.message);

    sendError(res, status, message, err.errors || []);
});

module.exports = app;
