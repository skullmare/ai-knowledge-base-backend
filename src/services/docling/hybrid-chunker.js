const axios = require('axios');
const FormData = require('form-data');

const { DOCLING_URL } = process.env;

const CHUNK_MAX_TOKENS = '800';

const requestChunks = async (formData) => {
    const { data } = await axios.post(`${DOCLING_URL}/v1/chunk/hybrid/file`, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });

    if (!data?.chunks?.length) throw new Error('Docling: чанки не получены');
    return data.chunks.map(c => c.text || c.raw_text).filter(Boolean);
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
    if (!DOCLING_URL) throw new Error('Не задан DOCLING_URL — разбор документов недоступен');

    const formData = new FormData();
    formData.append('files', buffer, {
        filename,
        contentType: contentType || 'application/octet-stream',
    });
    formData.append('chunking_max_tokens', CHUNK_MAX_TOKENS);
    formData.append('chunking_merge_peers', 'true');

    return requestChunks(formData);
}

module.exports = { getDoclingChunks, getDoclingChunksFromFile };
