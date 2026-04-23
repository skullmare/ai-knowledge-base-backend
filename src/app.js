const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const expressWs = require('express-ws');

const sendError = require('./utils/error-handler');
const logger = require('./utils/logger');
const { getHocuspocus } = require('./services/init-collaboration');

const userRoutes = require('./routes/platform-user');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const passwordRoutes = require('./routes/password');
const permissionsRoutes = require('./routes/permissions');
const healthRoutes = require('./routes/health');
const topicRoutes = require('./routes/topic');
const fileRoutes = require('./routes/file');
const platformRoleRoutes = require('./routes/platform-role');
const topicCategoriesRoutes = require('./routes/topic-category');
const logsRoutes = require('./routes/log');
const agentRoleRoutes = require('./routes/agent-role');
const agentUserRoutes = require('./routes/agent-user');

const app = express();
expressWs(app);

app.set('trust proxy', 1);

const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = isDev ? ['http://localhost:5173'] : ['https://operon-front-rocketmind.amvera.io'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10kb' }));

app.ws('/api/v1/collaboration', (ws, req) => {
    const hocuspocus = getHocuspocus();
    if (hocuspocus) {
        hocuspocus.handleConnection(ws, req);
    } else {
        logger.error('[WS] Hocuspocus ещё не инициализирован');
        ws.close(1011, 'Hocuspocus not ready');
    }
});

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/platform/roles', platformRoleRoutes);
app.use('/api/v1/topic/categories', topicCategoriesRoutes);
app.use('/api/v1/logs', logsRoutes);
app.use('/api/v1/agent/roles', agentRoleRoutes);
app.use('/api/v1/agent/users', agentUserRoutes);
app.use('/api/v1/permissions', permissionsRoutes);

app.use((req, res) => {
    sendError(res, 404, `Маршрут ${req.method} ${req.url} не найден`);
});

app.use((err, req, res) => {
    const status = err.status || 500;
    const message = err.message || 'Внутренняя ошибка сервера';
    const errors = err.errors || []; 
    sendError(res, status, message, errors);
});

module.exports = app;