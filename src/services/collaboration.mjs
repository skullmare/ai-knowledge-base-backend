import * as Y from 'yjs';
import { Hocuspocus } from '@hocuspocus/server';
import Topic from '../models/topic.js';
import PlatformUser from '../models/platform-user.js';
import authService from './auth.js';
import loggerModule from '../utils/logger.js';

const logger = loggerModule.default || loggerModule;

const { ServerBlockNoteEditor } = await import('@blocknote/server-util');
const sharedEditor = ServerBlockNoteEditor.create();

const STORE_DEBOUNCE_MS = 3000;

const toMarkdown = async (document) => {
    const fragment = document.getXmlFragment('document-store');
    const blocks = fragment
        ? sharedEditor.yXmlFragmentToBlocks(fragment)
        : sharedEditor.yDocToBlocks(document);

    return sharedEditor.blocksToMarkdownLossy(blocks);
};

const hocuspocusConfigured = new Hocuspocus().configure({
    debounce: STORE_DEBOUNCE_MS,

    async onAuthenticate({ token, context, connection }) {
        if (!token) throw new Error('Токен не предоставлен');

        const userData = authService.validateAccessToken(token);
        if (!userData) throw new Error('Неверный или просроченный токен');

        const user = await PlatformUser.findById(userData.id).populate('role', 'permissions').lean();
        if (!user) throw new Error('Пользователь не найден');
        if (user.status === 'blocked') throw new Error('Пользователь заблокирован');

        const permissions = user.role?.permissions || [];
        if (!permissions.includes('topics.read')) throw new Error('Нет доступа к чтению тем');

        // Раньше право на запись только вычислялось: пользователь с одним
        // topics.read мог править документ. readOnly включает это на уровне Hocuspocus.
        connection.readOnly = !permissions.includes('topics.update');
        context.user = { id: userData.id, canUpdate: !connection.readOnly };

        logger.success(`[WS] Аутентификация пройдена (readOnly: ${connection.readOnly})`);
    },

    async onLoadDocument({ documentName, document }) {
        const topic = await Topic.findById(documentName).select('+collaborationData');
        if (!topic) throw new Error(`Документ не найден: ${documentName}`);

        if (topic.collaborationData) Y.applyUpdate(document, topic.collaborationData);
        return document;
    },

    async onStoreDocument({ documentName, document, context }) {
        try {
            await Topic.findByIdAndUpdate(documentName, {
                collaborationData: Buffer.from(Y.encodeStateAsUpdate(document)),
                markdownContent: await toMarkdown(document),
                status: 'review',
                'vectorData.isIndexed': false,
                updatedBy: context.user?.id
            });

            logger.success(`[WS] Документ сохранён: ${documentName}`);
        } catch (error) {
            logger.error('[WS] Ошибка сохранения документа', null, error.message);
        }
    },

    async onDisconnect({ context }) {
        logger.success(`[WS] Подключение разорвано. UserId: ${context.user?.id}`);
    }
});

export default hocuspocusConfigured;
