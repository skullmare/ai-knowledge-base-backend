const axios = require('axios');
const FormData = require('form-data');

const { DOCLING_URL } = process.env;

const CHUNK_MAX_TOKENS = '800';
// Разбор большого PDF занимает минуты, но висеть бесконечно запрос не должен
const REQUEST_TIMEOUT_MS = Number(process.env.DOCLING_TIMEOUT_MS) || 5 * 60 * 1000;

/** Короткая выжимка тела ответа — в лог и в текст ошибки. */
const describeBody = (body) => {
    if (!body) return '';
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return text.length > 300 ? `${text.slice(0, 300)}…` : text;
};

/**
 * Ошибки axios теряют контекст: остаётся только «Request failed with status code 503».
 * Пересобираем сообщение так, чтобы из него было видно, какой сервис отказал.
 */
const withFlag = (message, cause, isUnavailable) => {
    const readable = new Error(message, { cause });
    // Позволяет вызывающему коду отличить «сервис лежит» от «формат не поддерживается»
    readable.isDoclingUnavailable = isUnavailable;
    return readable;
};

const toReadableError = (error, endpoint) => {
    if (error.response) {
        const { status, data } = error.response;
        const details = describeBody(data);

        const hint = status === 503 || status === 502 || status === 504
            ? ' Сервис разбора документов недоступен — проверьте, что Docling запущен и DOCLING_URL указывает на него.'
            : status === 404
                ? ' Эндпоинт не найден — вероятно, версия docling-serve не поддерживает /v1/chunk/hybrid/file.'
                : '';

        return withFlag(
            `Docling (${endpoint}) ответил ${status}.${hint}${details ? ` Ответ: ${details}` : ''}`,
            error,
            status >= 500
        );
    }

    if (error.code === 'ECONNABORTED') {
        return withFlag(
            `Docling (${endpoint}) не ответил за ${Math.round(REQUEST_TIMEOUT_MS / 1000)} с — документ слишком большой или сервис перегружен.`,
            error,
            true
        );
    }

    return withFlag(`Docling (${endpoint}) недоступен: ${error.code || error.message}`, error, true);
};

const requestChunks = async (formData) => {
    if (!DOCLING_URL) {
        throw withFlag('Не задан DOCLING_URL — разбор документов недоступен', null, true);
    }

    let data;
    try {
        ({ data } = await axios.post(`${DOCLING_URL}/v1/chunk/hybrid/file`, formData, {
            headers: formData.getHeaders(),
            timeout: REQUEST_TIMEOUT_MS,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }));
    } catch (error) {
        throw toReadableError(error, `${DOCLING_URL}/v1/chunk/hybrid/file`);
    }

    const chunks = (data?.chunks ?? []).map(c => c.text || c.raw_text).filter(Boolean);
    if (!chunks.length) throw new Error('Docling вернул пустой результат — из документа не удалось извлечь текст');

    return chunks;
};

async function getDoclingChunks(text) {
    const formData = new FormData();
    formData.append('files', Buffer.from(text), { filename: 'content.md', contentType: 'text/markdown' });
    formData.append('chunking_max_tokens', CHUNK_MAX_TOKENS);
    formData.append('chunking_merge_peers', 'true');

    return requestChunks(formData);
}

/**
 * Разбор бинарного документа (pdf, docx, xlsx, pptx…) в текстовые чанки.
 */
async function getDoclingChunksFromFile(buffer, filename, contentType) {
    const formData = new FormData();
    formData.append('files', buffer, {
        filename,
        contentType: contentType || 'application/octet-stream',
    });
    formData.append('chunking_max_tokens', CHUNK_MAX_TOKENS);
    formData.append('chunking_merge_peers', 'true');

    return requestChunks(formData);
}

/** Проверка доступности Docling — используется диагностикой /health/services. */
async function checkDoclingHealth() {
    if (!DOCLING_URL) return { ok: false, message: 'DOCLING_URL не задан' };

    try {
        const { status } = await axios.get(`${DOCLING_URL}/health`, { timeout: 5000 });
        return { ok: true, message: `Доступен (HTTP ${status})` };
    } catch (error) {
        return { ok: false, message: toReadableError(error, `${DOCLING_URL}/health`).message };
    }
}

module.exports = { getDoclingChunks, getDoclingChunksFromFile, checkDoclingHealth };
