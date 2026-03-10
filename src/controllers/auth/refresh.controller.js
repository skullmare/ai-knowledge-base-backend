const authService = require('../../services/auth.service');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const User = require('../../models/platformUser');
const logger = require('../../utils/logger');

module.exports = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return errorHandler(res, 401, 'Сессия истекла');
    }

    const decoded = authService.validateRefreshToken(token);

    if (!decoded) {
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.REFRESH_INVALID.key,
            message: 'Попытка обновления с невалидным или протухшим токеном',
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 403, 'Невалидный токен обновления', [
            { path: 'refreshToken', message: 'Refresh token invalid or expired' }
        ]);
    }

    try {
        await User.findByIdAndUpdate(decoded.id, {
            lastLogin: new Date()
        });
    } catch (error) {
        logger.error('Ошибка при обновлении lastLogin', details = error.message);
    }

    const { accessToken, refreshToken } = authService.generateTokens({
        id: decoded.id,
        role: decoded.role
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });

    return successHandler(res, 200, 'Токен успешно обновлен', { accessToken });
};