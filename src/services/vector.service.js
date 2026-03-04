const axios = require('axios');
const FormData = require('form-data');
const { qdrantClient } = require('../../config/qdrant');
const crypto = require('crypto');
const { OpenRouter } = require("@openrouter/sdk");

const DOCLING_URL = process.env.DOCLING_URL;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const COLLECTION_NAME = "knowledge_base";

const openrouter = new OpenRouter({
    apiKey: OPENROUTER_API_KEY,
});

/**
 * Вспомогательная функция для удаления всех чанков конкретного топика из Qdrant
 */
async function deleteTopicFromQdrant(topicId) {
    console.log(`🧹 Очистка старых векторов для топика: ${topicId}`);
    return await qdrantClient.delete(COLLECTION_NAME, {
        filter: {
            must: [
                {
                    key: "metadata.topicId",
                    match: { value: topicId.toString() }
                }
            ]
        }
    });
}

/**
 * 1. Нарезка через Docling
 */
async function getDoclingChunks(text) {
    const formData = new FormData();
    formData.append('files', Buffer.from(text), {
        filename: 'content.md',
        contentType: 'text/markdown'
    });
    
    formData.append('chunking_max_tokens', '800');
    formData.append('chunking_merge_peers', 'true');

    const response = await axios.post(`${DOCLING_URL}/v1/chunk/hybrid/file`, formData, {
        headers: { ...formData.getHeaders() }
    });

    if (!response.data?.chunks || response.data.chunks.length === 0) {
        throw new Error(`❌ Docling не вернул чанки. Статус: ${response.data?.documents?.[0]?.status}`);
    }

    console.log(`✅ Docling: ${response.data.chunks.length} чанков.`);
    return response.data.chunks.map(c => c.text || c.raw_text).filter(Boolean);
}

/**
 * 2. Векторизация через SDK
 */
async function getEmbeddings(chunks) {
    // text-embedding-3-small поддерживает до 8191 токенов на вход.
    // Если чанков очень много, SDK OpenRouter справится, но для гигантских текстов
    // здесь можно будет добавить разбиение на батчи.
    const embedding = await openrouter.embeddings.generate({
        requestBody: {
            model: "openai/text-embedding-3-small",
            input: chunks,
            encodingFormat: "float"
        }
    });

    return embedding.data;
}

/**
 * 3. Основной пайплайн синхронизации
 */
async function syncTopicToQdrant(topic) {
    try {
        const topicIdStr = topic._id.toString();
        console.log(`⏳ Начало синхронизации: "${topic.name}" (${topicIdStr})`);

        // ШАГ 1: Сначала удаляем старое, чтобы избежать дублей
        await deleteTopicFromQdrant(topicIdStr);

        // --- НОВЫЙ ЭТАП: ОБОГАЩЕНИЕ КОНТЕНТА ---
        // Добавляем информацию о файлах в конец текста, чтобы Docling их проиндексировал
        let enhancedContent = topic.content;
        
        if (topic.files && topic.files.length > 0) {
            const filesMarkdown = topic.files
                .map(f => `* Документ: ${f.description}. Ссылка: ${f.url}`)
                .join('\n');
            
            enhancedContent += `\n\n### Приложенные дополнительные материалы и файлы:\n${filesMarkdown}`;
        }
        // ---------------------------------------

        // ШАГ 2: Получаем чанки (используем обогащенный контент)
        const chunks = await getDoclingChunks(enhancedContent);

        // ШАГ 3: Получаем векторы
        const embeddingData = await getEmbeddings(chunks);

        // ШАГ 4: Формируем поинты для Qdrant
        const points = embeddingData.map((item, index) => ({
            id: crypto.randomUUID(),
            vector: item.embedding,
            payload: {
                text: chunks[index],
                metadata: {
                    topicId: topicIdStr,
                    name: topic.name,
                    category: topic.metadata.category?._id?.toString() || topic.metadata.category.toString(),
                    accessibleByRoles: topic.metadata.accessibleByRoles.map(r => r.toString()),
                    // Сохраняем массив файлов в метаданных каждого чанка для быстрого доступа бота
                    files: topic.files.map(f => ({
                        url: f.url,
                        description: f.description
                    }))
                }
            }
        }));

        // ШАГ 5: Загружаем в Qdrant
        await qdrantClient.upsert(COLLECTION_NAME, { 
            wait: true, 
            points 
        });

        console.log(`✅ Топик "${topic.name}" векторизован. Поинтов: ${points.length}. Файлов встроено: ${topic.files.length}`);
        return true;
    } catch (error) {
        console.error("❌ Ошибка в vector.service:", error.message);
        throw error; 
    }
}

module.exports = { 
    syncTopicToQdrant, 
    deleteTopicFromQdrant 
};