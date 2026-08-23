const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');
const { EMBEDDING_LIMITS } = require('../../constants/ai');

// Текстовые форматы читаем сами: текст дешевле файлового ввода и даёт
// осмысленный фрагмент в контекст агента
const PLAIN_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.yaml', '.yml',
    '.xml', '.html', '.htm', '.log',
]);

const isPlainText = (mimeType = '') =>
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml';

const toDataUri = (buffer, mimeType) =>
    `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;

const filePart = (buffer, filename, mimeType) => ({
    content: [{
        type: 'file',
        file: { filename, file_data: toDataUri(buffer, mimeType) },
    }],
});

const imagePart = (buffer, mimeType) => ({
    content: [{
        type: 'image_url',
        image_url: { url: toDataUri(buffer, mimeType) },
    }],
});

/**
 * PDF режем на части: за один запрос модель принимает не больше
 * EMBEDDING_LIMITS.PDF_PAGES_PER_REQUEST страниц.
 */
const splitPdf = async (buffer, filename) => {
    const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = source.getPageCount();
    const perRequest = EMBEDDING_LIMITS.PDF_PAGES_PER_REQUEST;

    if (pageCount <= perRequest) {
        return [{
            input: filePart(buffer, filename, 'application/pdf'),
            text: `Файл «${filename}», страницы 1–${pageCount}`,
        }];
    }

    const segments = [];

    for (let start = 0; start < pageCount; start += perRequest) {
        const end = Math.min(start + perRequest, pageCount);

        const part = await PDFDocument.create();
        const pages = await part.copyPages(source, Array.from(
            { length: end - start },
            (_, i) => start + i
        ));
        pages.forEach((page) => part.addPage(page));

        const partName = `${path.basename(filename, '.pdf')}_стр_${start + 1}-${end}.pdf`;

        segments.push({
            input: filePart(Buffer.from(await part.save()), partName, 'application/pdf'),
            text: `Файл «${filename}», страницы ${start + 1}–${end}`,
        });
    }

    return segments;
};

/**
 * Готовит из файла список сегментов для векторизации.
 * Каждый сегмент — это одна точка в Qdrant: `input` уходит в модель,
 * `text` кладётся в payload и попадает в контекст агента.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} [mimeType]
 * @returns {Promise<{ segments: Array<{input: string|object, text: string}>, kind: 'text'|'file' }>}
 */
async function buildSegments(buffer, filename, mimeType) {
    const extension = path.extname(filename || '').toLowerCase();

    if (PLAIN_TEXT_EXTENSIONS.has(extension) || isPlainText(mimeType)) {
        const text = buffer.toString('utf8').trim();
        if (!text) throw new Error('Файл пустой — векторизовать нечего');

        const chunks = await getMarkdownChunks(text);
        return {
            kind: 'text',
            segments: chunks.map((chunk) => ({ input: chunk, text: chunk })),
        };
    }

    if (extension === '.pdf' || mimeType === 'application/pdf') {
        return { kind: 'file', segments: await splitPdf(buffer, filename) };
    }

    if (mimeType?.startsWith('image/')) {
        return {
            kind: 'file',
            segments: [{
                input: imagePart(buffer, mimeType),
                text: `Изображение «${filename}»`,
            }],
        };
    }

    // Остальное (docx, xlsx, pptx, аудио, видео) модель принимает как файл
    return {
        kind: 'file',
        segments: [{
            input: filePart(buffer, filename, mimeType),
            text: `Файл «${filename}»`,
        }],
    };
}

module.exports = { buildSegments, PLAIN_TEXT_EXTENSIONS };
