const Y = require('yjs');
const { Hocuspocus } = require('@hocuspocus/server');
const { Tiptap } = require('@hocuspocus/transformer');
const Topic = require('../models/topic');
const { validateAccessToken } = require('./auth');
const logger = require('../utils/logger');

function extractPlainText(tiptapDoc) {
    if (!tiptapDoc || !Array.isArray(tiptapDoc.content)) return '';

    const texts = [];

    function traverse(node) {
        if (!node) return;

        if (node.type === 'text' && node.text) {
            texts.push(node.text);
        }

        if (node.attrs?.url) {
            texts.push(node.attrs.url);
        }

        if (node.attrs?.caption) {
            texts.push(node.attrs.caption);
        }

        if (Array.isArray(node.content)) {
            node.content.forEach(traverse);
        }
    }

    traverse(tiptapDoc);

    return texts.join(' ').trim().replace(/\s+/g, ' ');
}

const hocuspocusConfigured = new Hocuspocus().configure({
    debounce: 3000,

    async onAuthenticate({ token, context }) {
        if (!token) throw new Error('Токен не предоставлен');
        const userData = validateAccessToken(token);
        if (!userData) throw new Error('Неверный или просроченный токен');
        context.user = userData;
        logger.success('[WS] Аутентификация пройдена успешно');
    },

    async onConnect({ context }) {
        logger.success(`[WS] Подключение установлено`);
    },

    async onLoadDocument({ documentName, document }) {
        const topic = await Topic.findById(documentName).select('+collaborationData');
        if (!topic) throw new Error(`Документ не найден: ${documentName}`);
        if (topic.collaborationData) Y.applyUpdate(document, topic.collaborationData);
        return document;
    },

    async onStoreDocument({ documentName, document, context }) {
        try {
            const jsonContent = new Tiptap().fromYdoc(document);
            const tiptapDoc = jsonContent['document-store'];

            await Topic.findByIdAndUpdate(documentName, {
                collaborationData: Buffer.from(Y.encodeStateAsUpdate(document)),
                content: tiptapDoc?.content ?? [],
                plainTextContent: extractPlainText(tiptapDoc),
                updatedBy: context.user.id,
            });

            logger.success(`[WS] Документ сохранён: ${documentName}`);
        } catch (error) {
            logger.error('[WS] onStoreDocument ошибка:', null, error);
        }
    },

    async onDisconnect({ context }) {
        logger.success(`[WS] Подключение разорвано. UserId: ${context.user?.id}`);
    },
});

module.exports = hocuspocusConfigured;