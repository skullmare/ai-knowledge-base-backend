const path = require('path');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');
const { getDoclingChunksFromFile } = require('../docling/hybrid-chunker');

// Расширения, которые читаются как обычный текст
const PLAIN_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.yaml', '.yml',
    '.xml', '.html', '.htm', '.log', '.rtf',
]);

// Документы, которые разбирает Docling
const DOCUMENT_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
]);

const isPlainText = (mimeType = '') =>
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml';

/**
 * Превращает файл в текстовые чанки, готовые к векторизации.
 *
 * @param {Buffer} buffer
 * @param {string} filename — имя с расширением
 * @param {string} [mimeType]
 * @returns {Promise<string[]>}
 */
async function extractChunks(buffer, filename, mimeType) {
    const extension = path.extname(filename || '').toLowerCase();

    if (DOCUMENT_EXTENSIONS.has(extension)) {
        return getDoclingChunksFromFile(buffer, filename, mimeType);
    }

    if (PLAIN_TEXT_EXTENSIONS.has(extension) || isPlainText(mimeType)) {
        const text = buffer.toString('utf8').trim();
        if (!text) throw new Error('Файл пустой — векторизовать нечего');
        return getMarkdownChunks(text);
    }

    // Неизвестный формат — пробуем отдать Docling, он покрывает больше типов
    try {
        return await getDoclingChunksFromFile(buffer, filename, mimeType);
    } catch (error) {
        // Недоступный сервис — это не «формат не поддерживается»: не подменяем причину
        if (error.isDoclingUnavailable) throw error;

        throw new Error(
            `Формат файла "${extension || mimeType || 'неизвестный'}" не поддерживается для векторизации: ${error.message}`,
            { cause: error }
        );
    }
}

module.exports = { extractChunks, PLAIN_TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS };
