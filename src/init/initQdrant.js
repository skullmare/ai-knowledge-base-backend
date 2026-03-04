const { qdrantClient } = require('../../config/qdrant');

async function initQdrant() {
    const collectionName = "knowledge_base";

    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);

        if (!exists) {
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1536, 
                    distance: 'Cosine'
                }
            });

            // 1. Индекс для категорий (нужен для фильтрации в поиске)
            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.category",
                field_schema: "keyword"
            });

            // 2. Индекс для ролей (КРИТИЧЕСКИ ВАЖЕН для безопасности/RBAC)
            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.accessibleByRoles",
                field_schema: "keyword"
            });

            // 3. Индекс для ID топика (КРИТИЧЕСКИ ВАЖЕН для быстрого удаления/обновления)
            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.topicId",
                field_schema: "keyword"
            });

            console.log(`✅ Инициализация коллекции ${collectionName} и всех индексов завершена`);
        } else {
            // Даже если коллекция существует, полезно убедиться, что индекс для topicId есть.
            // Но для простоты пока оставим так.
            console.log(`ℹ️ Коллекция ${collectionName} уже существует`);
        }
    } catch (error) {
        console.error("❌ Ошибка при инициализации Qdrant:", error);
    }
}

module.exports = { initQdrant };