const path = require('path');
const { parseOffice } = require('officeparser');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');

// Текстовые форматы читаем напрямую
const PLAIN_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.yaml', '.yml',
    '.xml', '.html', '.htm', '.log',
]);

// Документы, из которых текст достаётся officeparser (в процессе, без внешнего сервиса)
const DOCUMENT_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.rtf', '.epub',
]);

const isPlainText = (mimeType = '') =>
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml';

/**
 * RouterAI проксирует эмбеддинги по обычной OpenAI-схеме: `input` принимает
 * только строки. Мультимодальный ввод самой модели через него недоступен,
 * поэтому текст из документов достаём на своей стороне.
 */
const extractText = async (buffer, filename) => {
    try {
        const parsed = await parseOffice(buffer);
        return parsed.toText().trim();
    } catch (error) {
        throw new Error(
            `Не удалось извлечь текст из файла «${filename}»: ${error.message}`,
            { cause: error }
        );
    }
};

const toSegments = async (text, filename) => {
    if (!text) {
        throw new Error(
            `В файле «${filename}» не найдено текста. Отсканированные документы без текстового слоя векторизовать нельзя.`
        );
    }

    const chunks = await getMarkdownChunks(text);
    return chunks.map((chunk) => ({ input: chunk, text: chunk }));
};

/**
 * Готовит из файла список сегментов для векторизации.
 * Каждый сегмент — это одна точка в Qdrant: `input` уходит в модель,
 * `text` кладётся в payload и попадает в контекст агента.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} [mimeType]
 * @returns {Promise<{ segments: Array<{input: string, text: string}> }>}
 */
async function buildSegments(buffer, filename, mimeType) {
    const extension = path.extname(filename || '').toLowerCase();

    if (PLAIN_TEXT_EXTENSIONS.has(extension) || isPlainText(mimeType)) {
        return { segments: await toSegments(buffer.toString('utf8').trim(), filename) };
    }

    if (DOCUMENT_EXTENSIONS.has(extension)) {
        return { segments: await toSegments(await extractText(buffer, filename), filename) };
    }

    // Картинки, аудио и видео модель умеет, но RouterAI их не пропускает
    if (/^(image|audio|video)\//.test(mimeType ?? '')) {
        throw new Error(
            `Файлы такого типа (${mimeType}) векторизовать нельзя: RouterAI принимает только текстовый ввод.`
        );
    }

    // Неизвестное расширение — пробуем разобрать как документ
    return { segments: await toSegments(await extractText(buffer, filename), filename) };
}

module.exports = { buildSegments, PLAIN_TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS };
