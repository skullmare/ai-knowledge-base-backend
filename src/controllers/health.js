const mongoose = require('mongoose');
const { qdrantClient } = require('../../config/qdrant');
const { listModels } = require('../services/ai/list-models');
const { getSetting } = require('../services/settings');
const { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = require('../constants/ai');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

const health = async (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
};

const probe = async (name, fn) => {
    try {
        return { name, ...(await fn()) };
    } catch (error) {
        return { name, ok: false, message: error.message };
    }
};

const checkMongo = async () => {
    const states = ['отключена', 'подключена', 'подключается', 'отключается'];
    const state = mongoose.connection.readyState;
    return { ok: state === 1, message: `Соединение ${states[state] ?? state}` };
};

const checkQdrant = async () => {
    const info = await qdrantClient.getCollection(COLLECTION);
    const size = info?.config?.params?.vectors?.size;

    if (size && size !== EMBEDDING_DIMENSIONS) {
        return {
            ok: false,
            message: `Размерность коллекции ${size} не совпадает с моделью ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}). Пересоздайте коллекцию на вкладке RouterAI.`,
        };
    }

    return { ok: true, message: `Коллекция ${COLLECTION}, размерность ${size}, точек: ${info?.points_count ?? 0}` };
};

const checkRouterAi = async () => {
    const models = await listModels();
    const chatModel = await getSetting('ai_chat_model');

    const known = new Set(models.map(m => m.id));
    const missing = [chatModel, EMBEDDING_MODEL].filter(model => model && !known.has(model));

    return {
        ok: !missing.length,
        message: missing.length
            ? `Доступно моделей: ${models.length}, но не найдены: ${missing.join(', ')}`
            : `Доступно моделей: ${models.length}`,
    };
};

/**
 * Диагностика внешних сервисов. Нужна, когда векторизация падает:
 * показывает, кто именно отказал, без чтения логов сервера.
 */
const services = async (req, res) => {
    const checks = await Promise.all([
        probe('mongodb', checkMongo),
        probe('qdrant', checkQdrant),
        probe('routerai', checkRouterAi),
    ]);

    const ok = checks.every(check => check.ok);

    res.status(ok ? 200 : 503).json({
        success: ok,
        message: ok ? 'Все сервисы доступны' : 'Часть сервисов недоступна',
        data: { checks },
    });
};

module.exports = { health, services };
