const authService = require('../../services/auth.service');
const User = require('../../models/platformUser');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    try {
        const { login, password } = req.body;
        const user = await User.findOne({ login }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: 'Ошибка авторизации',
                errors: [{ path: 'login', message: 'Неверный логин или пароль' }]
            });
        }

        const payload = { id: user._id, role: user.role };
        const { accessToken, refreshToken } = authService.generateTokens(payload);

        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        
        return res.status(200).json({
            success: true,
            message: 'Вход выполнен успешно',
            data: { accessToken }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};

const refresh = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Сессия истекла' });

    const decoded = authService.validateRefreshToken(token);
    if (!decoded) {
        return res.status(403).json({
            success: false,
            message: 'Невалидный токен обновления',
            errors: [{ path: 'refreshToken', message: 'Refresh token invalid or expired' }]
        });
    }

    const { accessToken, refreshToken } = authService.generateTokens({ id: decoded.id, role: decoded.role });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return res.status(200).json({
        success: true,
        message: 'Токен успешно обновлен',
        data: { accessToken }
            
    });
};

const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('role');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
                errors: [{ path: 'id', message: 'Профиль не существует' }]
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Данные профиля получены',
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};

module.exports = { login, refresh, me };