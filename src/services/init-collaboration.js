const logger = require('../utils/logger');

let hocuspocusConfigured = null;

async function initHocuspocus() {
    try {
        const module = await import('./collaboration.mjs');
        hocuspocusConfigured = module.default;
        logger.success('[WS] Hocuspocus успешно загружен (ESM)');
        return hocuspocusConfigured;
    } catch (error) {
        logger.error('[WS] Ошибка загрузки Hocuspocus:', null, error);
        throw error;
    }
}

function getHocuspocus() {
    return hocuspocusConfigured;
}

module.exports = {
    initHocuspocus,
    getHocuspocus
};