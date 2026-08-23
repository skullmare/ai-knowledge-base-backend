// Модель эмбеддингов зафиксирована: вся векторная база лежит в её пространстве,
// смена модели означает пересоздание коллекции, поэтому из настроек её не меняют.
const EMBEDDING_MODEL = 'google/gemini-embedding-2';

// Gemini Embedding 2 отдаёт 3072-мерные векторы
const EMBEDDING_DIMENSIONS = 3072;

/**
 * Ограничения одного запроса к модели (см. документацию Gemini Embedding 2).
 * Текст и файлы шлём разными пачками: у них разные лимиты и разная цена.
 */
const EMBEDDING_LIMITS = {
    TEXT_BATCH: 64,
    PDF_PAGES_PER_REQUEST: 6,
    IMAGES_PER_REQUEST: 6,
};

module.exports = { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, EMBEDDING_LIMITS };
