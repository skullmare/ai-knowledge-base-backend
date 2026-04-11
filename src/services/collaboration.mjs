import * as Y from 'yjs';
import { Hocuspocus } from '@hocuspocus/server';
import topicModule from '../models/topic.js';
import platformUserModule from '../models/platform-user.js';
import authModule from './auth.js';
import loggerModule from '../utils/logger.js';

const Topic = topicModule;
const PlatformUser = platformUserModule;
const { validateAccessToken } = authModule;
const logger = loggerModule.default || loggerModule;

const hocuspocusConfigured = new Hocuspocus().configure({
    debounce: 3000,

    async onAuthenticate({ token, context }) {
        if (!token) throw new Error('Токен не предоставлен');
        const userData = validateAccessToken(token);
        if (!userData) throw new Error('Неверный или просроченный токен');
        const user = await PlatformUser.findById(userData.id).populate('role', 'permissions')
        const hasTopicsRead = user.role.permissions?.includes('topics.read') || false;
        const hasTopicsUpdate = user.role.permissions?.includes('topics.update') || false;
        if (!hasTopicsRead) {
            throw new Error('Нет доступа к чтению тем');
        }
        context.user = {
            ...userData,
            hasTopicsUpdate
        };
        logger.success('[WS] Аутентификация пройдена успешно');
    },

    async onConnect({ context }) {
        logger.success(`[WS] Подключение установлено`);
    },

    async onLoadDocument({ documentName, document, context }) {
        const topic = await Topic.findById(documentName).select('+collaborationData');
        if (!topic) throw new Error(`Документ не найден: ${documentName}`);
        if (topic.collaborationData) Y.applyUpdate(document, topic.collaborationData);
        return document;
    },

    async onStoreDocument({ documentName, document, context }) {
        try {
            const binaryUpdate = Buffer.from(Y.encodeStateAsUpdate(document));
            const { ServerBlockNoteEditor } = await import('@blocknote/server-util');
            const editor = ServerBlockNoteEditor.create();
            const xmlFragment = document.getXmlFragment('document-store');
            let markdown = '';
            if (xmlFragment) {
                const blocks = editor.yXmlFragmentToBlocks(xmlFragment);
                markdown = await editor.blocksToMarkdownLossy(blocks);
            } else {
                const blocks = editor.yDocToBlocks(document);
                markdown = await editor.blocksToMarkdownLossy(blocks);
            }

            await Topic.findByIdAndUpdate(documentName, {
                collaborationData: binaryUpdate,
                markdownContent: markdown,
                status: "review",
                updatedBy: context.user.id,
            });

            logger.success(`[WS] Документ сохранён с Markdown: ${documentName}`);
        } catch (error) {
            logger.error('[WS] onStoreDocument ошибка:', null, error);
        }
    },

    async onDisconnect({ context }) {
        logger.success(`[WS] Подключение разорвано. UserId: ${context.user?.id}`);
    },
});

export default hocuspocusConfigured;