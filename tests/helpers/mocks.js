// Заглушки внешних систем. Сами вызовы jest.mock живут в tests/setup.js,
// чтобы пути резолвились одинаково для всех тестовых файлов.
const externalMocks = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),

    s3Send: jest.fn().mockResolvedValue({}),

    qdrant: {
        search: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ status: 'completed' }),
        delete: jest.fn().mockResolvedValue({ status: 'completed' }),
        getCollections: jest.fn().mockResolvedValue({ collections: [] }),
        createCollection: jest.fn().mockResolvedValue(true),
        createPayloadIndex: jest.fn().mockResolvedValue(true)
    },

    chat: jest.fn().mockResolvedValue('Ответ агента'),
    getEmbeddings: jest.fn(async (chunks) =>
        chunks.map(() => ({ embedding: Array.from({ length: 8 }, () => 0.1) }))
    ),

    telegramBot: {
        sendMessage: jest.fn().mockResolvedValue({}),
        sendChatAction: jest.fn().mockResolvedValue({}),
        on: jest.fn()
    },

    maxBot: {
        sendMessageToUser: jest.fn().mockResolvedValue({}),
        sendMessageToChat: jest.fn().mockResolvedValue({}),
        sendTyping: jest.fn().mockResolvedValue({}),
        getUpdates: jest.fn().mockResolvedValue([])
    }
};

module.exports = externalMocks;
