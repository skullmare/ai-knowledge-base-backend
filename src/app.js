const express = require('express');
const cookieParser = require('cookie-parser'); 
const sendError = require('./utils/errorHandler'); // Импортируем твою утилиту

const userRoutes = require('./routes/platformUsers.routes');
const authRoutes = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');
const topicRoutes = require('./routes/topics.routes');
const fileRoutes = require('./routes/files.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Маршруты
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/files', fileRoutes);

// 1. Обработка несуществующих маршрутов (404)
app.use((req, res) => {
    sendError(res, 404, `Маршрут ${req.method} ${req.url} не найден`);
});

// 2. Глобальный обработчик ошибок (Middleware)
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    
    const status = err.status || 500;
    const message = err.message || 'Внутренняя ошибка сервера';
    
    // Если есть специфические ошибки (например, от валидатора), передаем их в массив
    const errors = err.errors || []; 

    sendError(res, status, message, errors);
});

module.exports = app;