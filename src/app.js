const express = require('express');
const cookieParser = require('cookie-parser'); 
const sendError = require('./utils/errorHandler');
const logger = require('./utils/logger');

const userRoutes = require('./routes/platformUsers.routes');
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const passwordRoutes = require('./routes/password.routes');
const healthRoutes = require('./routes/health.routes');
const topicRoutes = require('./routes/topics.routes');
const fileRoutes = require('./routes/files.routes');
const platformRoleRoutes = require('./routes/platformRoles.routes');
const topicCategoriesRoutes = require('./routes/topicCategories.routes');


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/platform/roles', platformRoleRoutes);
app.use('/api/v1/topic/categories', topicCategoriesRoutes);

app.use((req, res) => {
    sendError(res, 404, `Маршрут ${req.method} ${req.url} не найден`);
});

app.use((err, req, res, next) => {    
    const status = err.status || 500;
    const message = err.message || 'Внутренняя ошибка сервера';
    const errors = err.errors || []; 
    sendError(res, status, message, errors);
});

module.exports = app;