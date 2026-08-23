const { updateSettings } = require('../../services/settings');
const { invalidateAIClient } = require('../../services/ai/client');
const { SETTINGS_MAP } = require('../../constants/settings');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

// Каждая группа настроек закрыта своим правом
const GROUP_PERMISSIONS = {
    ai: 'system_settings.ai_provider',
    agent: 'system_settings.agent',
    google_drive: 'system_settings.google_drive',
};

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { settings } = req.validatedData.body;
        const keys = Object.keys(settings);

        const userPermissions = req.userPermissions ?? [];
        const forbidden = keys.filter((key) => {
            const permission = GROUP_PERMISSIONS[SETTINGS_MAP[key]?.group];
            return permission && !userPermissions.includes(permission);
        });

        if (forbidden.length) {
            return errorHandler(res, 403, 'Недостаточно прав', forbidden.map((key) => ({
                path: key,
                message: `Нет прав на изменение настройки «${SETTINGS_MAP[key]?.name ?? key}»`,
            })));
        }

        await updateSettings(settings);
        invalidateAIClient();

        await logHandler({
            action: ACTIONS_CONFIG.SYSTEM_SETTINGS.actions.UPDATE.key,
            message: `Обновлены системные настройки: ${keys.join(', ')}`,
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Настройки сохранены', { keys });
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.SYSTEM_SETTINGS.actions.UPDATE.key,
            message: `Ошибка сохранения системных настроек: ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка сервера при сохранении настроек', [
            { path: 'server', message: error.message },
        ]);
    }
};
