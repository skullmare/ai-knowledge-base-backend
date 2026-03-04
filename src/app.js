// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser'); 

const userRoutes = require('./routes/platformUsers.routes');
const authRoutes = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');
const topicRoutes = require('./routes/topics.routes');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/topics', topicRoutes);


app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Маршрут ${req.method} ${req.url} не найден`
  });
});

app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';
  
  res.status(status).json({
    status: status,
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;