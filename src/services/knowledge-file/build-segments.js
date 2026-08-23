const path = require('path');
const { parseOffice } = require('officeparser');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');

// Текстовые форматы читаем напрямую
const PLAIN_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.yaml', '.yml',
    '.xml', '.html', '.htm', '.log',
]);

// Форматы, из которых текст достаёт officeparser (в процессе, без внешнего сервиса)
const DOCUMENT_EXTENSIONS = new Set([
    '.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.rtf', '.epub',
]);

// Старые бинарные форматы Office — officeparser их не читает
const LEGACY_EXTENSIONS = new Map([
    ['.doc', '.docx'],
    ['.xls', '.xlsx'],
    ['.ppt', '.pptx'],
]);

// Сколько строк таблицы уходит в один чанк вместе с шапкой
const TABLE_ROWS_PER_CHUNK = 25;

const isPlainText = (mimeType = '') =>
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml';

const cellText = (cell) => String(cell?.text ?? '').trim();

const rowText = (row) => (row.children ?? []).map(cellText).join(' | ').trim();

/**
 * Таблицы разбираем отдельно: officeparser отдаёт каждую ячейку своей строкой,
 * из-за чего теряется связь «строка таблицы → значение». Собираем строку в одну
 * текстовую строку и повторяем шапку в каждом чанке — иначе после нарезки
 * фрагмент состоит из голых чисел без названий колонок.
 */
const renderSheet = (sheet) => {
    const rows = (sheet.children ?? [])
        .filter((node) => node.type === 'row')
        .map(rowText)
        .filter((line) => line.replace(/\|/g, '').trim());

    if (!rows.length) return [];

    const sheetName = sheet.metadata?.sheetName;
    const title = sheetName ? `Лист «${sheetName}»` : 'Таблица';
    const [header, ...body] = rows;

    if (!body.length) return [`${title}\n${header}`];

    const chunks = [];
    for (let i = 0; i < body.length; i += TABLE_ROWS_PER_CHUNK) {
        const part = body.slice(i, i + TABLE_ROWS_PER_CHUNK);
        chunks.push([title, header, ...part].join('\n'));
    }

    return chunks;
};

const collectSheets = (node, acc = []) => {
    if (!node) return acc;
    if (Array.isArray(node)) {
        node.forEach((child) => collectSheets(child, acc));
        return acc;
    }
    if (node.type === 'sheet') acc.push(node);
    else if (node.children) collectSheets(node.children, acc);
    return acc;
};

/**
 * Эндпоинт эмбеддингов RouterAI принимает только строки (по спецификации
 * `input` — строка или массив строк), поэтому текст из документов достаём на
 * своей стороне. Файлы RouterAI умеет принимать, но только в
 * `/v1/chat/completions` — для построения вектора это не подходит.
 */
const parseDocument = async (buffer, filename) => {
    try {
        return await parseOffice(buffer);
    } catch (error) {
        throw new Error(
            `Не удалось извлечь текст из файла «${filename}»: ${error.message}`,
            { cause: error }
        );
    }
};

const toSegments = async (text, filename) => {
    if (!text?.trim()) {
        throw new Error(
            `В файле «${filename}» не найдено текста. Отсканированные документы без текстового слоя векторизовать нельзя.`
        );
    }

    const chunks = await getMarkdownChunks(text.trim());
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

    if (LEGACY_EXTENSIONS.has(extension)) {
        throw new Error(
            `Формат ${extension} — устаревший бинарный формат Office, он не поддерживается. ` +
            `Пересохраните файл как ${LEGACY_EXTENSIONS.get(extension)} и загрузите заново.`
        );
    }

    if (PLAIN_TEXT_EXTENSIONS.has(extension) || isPlainText(mimeType)) {
        return { segments: await toSegments(buffer.toString('utf8'), filename) };
    }

    if (/^(image|audio|video)\//.test(mimeType ?? '')) {
        throw new Error(
            `Файлы такого типа (${mimeType}) векторизовать нельзя: вектор строится только из текста.`
        );
    }

    if (!DOCUMENT_EXTENSIONS.has(extension) && extension) {
        throw new Error(
            `Формат ${extension} не поддерживается. Поддерживаются: ` +
            `${[...DOCUMENT_EXTENSIONS, ...PLAIN_TEXT_EXTENSIONS].join(', ')}.`
        );
    }

    const parsed = await parseDocument(buffer, filename);

    // Таблицы собираем построчно, остальное — сплошным текстом
    const sheetChunks = collectSheets(parsed.content).flatMap(renderSheet);
    if (sheetChunks.length) {
        return { segments: sheetChunks.map((chunk) => ({ input: chunk, text: chunk })) };
    }

    return { segments: await toSegments(parsed.toText(), filename) };
}

module.exports = {
    buildSegments,
    PLAIN_TEXT_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    LEGACY_EXTENSIONS,
};
