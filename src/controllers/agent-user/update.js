const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const { getBot: getTGBot } = require('../../services/telegram/bot');
const { getBot: getMAXBot } = require('../../services/max/bot');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        const previousUser = await AgentUser.findById(id);
        const roleWasNull = previousUser && !previousUser.role;

        if (data.role) {
            data.status = 'active';
        }
        const updatedAgentUser = await AgentUser.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        ).populate('role', 'name');

        if (!updatedAgentUser) {
            await logHandler({
                action: ACTIONS_CONFIG.AGENT_USERS.actions.UPDATE.key,
                message: `Попытка обновить несуществующего пользователя (ID: ${id})`,
                userId: currentPlatformUserId,
                status: 'error'
            });

            return errorHandler(
                res,
                404,
                'Пользователь не найден',
                [{ path: 'id', message: 'Пользователь с указанным ID не существует' }]
            );
        }

        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.UPDATE.key,
            message: `Обновлены данные пользователя (ID: ${updatedAgentUser._id})`,
            userId: currentPlatformUserId,
            entityId: updatedAgentUser._id,
            status: 'success'
        });

        if (roleWasNull && updatedAgentUser.role) {
            const notificationText = 'Вам предоставлен доступ к ИИ-агенту. Напишите сообщение, чтобы начать.';

            if (updatedAgentUser.chatIdTG) {
                const tgBot = getTGBot();
                if (tgBot) tgBot.sendMessage(updatedAgentUser.chatIdTG, notificationText).catch(() => {});
            }

            if (updatedAgentUser.chatIdMAX) {
                const maxBot = getMAXBot();
                if (maxBot) maxBot.sendMessageToChat(updatedAgentUser.chatIdMAX, notificationText).catch(() => {});
            }
        }

        return successHandler(res, 200, 'Данные пользователя успешно обновлены', updatedAgentUser);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении пользователя (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};
