const jwt = require('jsonwebtoken');

class AuthService {
    generateTokens(payload) {
        // Проверяем, находимся ли мы в режиме разработки
        const isDev = process.env.NODE_ENV === 'development';

        // Определяем время жизни: 365 дней для разработки, стандартные значения для продакшна
        const accessExpiresIn = isDev ? '365d' : '15m';
        const refreshExpiresIn = isDev ? '365d' : '7d';

        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { 
            expiresIn: accessExpiresIn 
        });
        
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { 
            expiresIn: refreshExpiresIn 
        });

        if (isDev) {
            console.log(`⚠️  Внимание: Токены выпущены с девелоперским сроком жизни (1 год)`);
        }

        return { accessToken, refreshToken };
    }

    verifyRefresh(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    }

    validateAccessToken(token) {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    }
}

module.exports = new AuthService();