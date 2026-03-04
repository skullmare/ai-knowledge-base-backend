const jwt = require('jsonwebtoken');

class AuthService {
    generateTokens(payload) {
        const isDev = process.env.NODE_ENV === 'development';
        const accessLimit = isDev ? '365d' : '15m';
        const refreshLimit = isDev ? '365d' : '7d';

        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: accessLimit });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: refreshLimit });

        return { accessToken, refreshToken };
    }

    validateAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (e) {
            return null;
        }
    }

    validateRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (e) {
            return null;
        }
    }
}

module.exports = new AuthService();