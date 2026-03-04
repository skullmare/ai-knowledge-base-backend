const authService = require('../../services/auth.service');
const User = require('../../models/platformUser');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
  const { login, password } = req.body;
  const user = await User.findOne({ login }).select('+password');

  if (user && (await bcrypt.compare(password, user.password))) {
    const tokens = authService.generateTokens({ id: user._id, role: user.role });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true });
    return res.json({ accessToken: tokens.accessToken });
  }

  return res.status(401).json({ message: 'Неправильный логин или пароль!' });
};

const refresh = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.sendStatus(401);

    try {
        const decoded = authService.verifyRefresh(token);
        const tokens = authService.generateTokens({ id: decoded.id, role: decoded.role });

        res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true });
        res.json({ accessToken: tokens.accessToken });
    } catch (e) {
        res.sendStatus(403);
    }
};

const me = async (req, res) => {
    try {
        // req.user.id берется из middleware после валидации токена
        const user = await User.findById(req.user.id).populate('role');

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при получении данных' });
    }
}

module.exports = { login, refresh, me };