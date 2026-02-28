const axios = require('axios');
const FormData = require('form-data');
const { qdrantClient } = require('../../config/qdrant');
const crypto = require('crypto');
const { OpenRouter } = require("@openrouter/sdk"); // Подключаем SDK

const DOCLING_URL = process.env.DOCLING_URL;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Инициализируем клиент OpenRouter
const openrouter = new OpenRouter({
    apiKey: OPENROUTER_API_KEY,
});

/**
 * 1. Нарезка через Docling
 */
async function getDoclingChunks(text) {
    const formData = new FormData();
    formData.append('files', Buffer.from(text), {
        filename: 'content.md',
        contentType: 'text/markdown'
    });
    // Твои проверенные настройки
    formData.append('chunking_max_tokens', '2000');
    formData.append('chunking_merge_peers', 'true');

    const response = await axios.post(`${DOCLING_URL}/v1/chunk/hybrid/file`, formData, {
        headers: { ...formData.getHeaders() }
    });

    if (!response.data?.chunks || response.data.chunks.length === 0) {
        throw new Error(`Docling не вернул чанки. Статус: ${response.data?.documents?.[0]?.status}`);
    }

    console.log(`✅ Docling: ${response.data.chunks.length} чанков.`);
    return response.data.chunks.map(c => c.text || c.raw_text).filter(Boolean);
}

/**
 * 2. Векторизация через SDK
 */
async function getEmbeddings(chunks) {
    const embedding = await openrouter.embeddings.generate({
        requestBody: {
            model: "openai/text-embedding-3-small",
            input: chunks, // SDK сам отправит массив правильно
            encodingFormat: "float"
        }
    });

    // SDK возвращает объект, где данные лежат в .data
    return embedding.data;
}

/**
 * 3. Пайплайн
 */
async function syncTopicToQdrant(topic) {
    try {
        console.log(`⏳ Обработка: "${topic.name}"...`);

        const chunks = await getDoclingChunks(topic.content);
        const embeddingData = await getEmbeddings(chunks);

        const points = embeddingData.map((item, index) => ({
            id: crypto.randomUUID(),
            vector: item.embedding,
            payload: {
                text: chunks[index],
                metadata: {
                    topicId: topic._id.toString(),
                    name: topic.name,
                    category: topic.metadata.category.toString(),
                    accessibleByRoles: topic.metadata.accessibleByRoles.map(r => r.toString())
                }
            }
        }));

        await qdrantClient.upsert("knowledge_base", { wait: true, points });

        console.log(`✅ Успех! Статья сохранена в Qdrant.`);
    } catch (error) {
        // SDK пробрасывает ошибки в понятном виде
        console.error("❌ Ошибка пайплайна:", error.message);
    }
}

module.exports = { syncTopicToQdrant };