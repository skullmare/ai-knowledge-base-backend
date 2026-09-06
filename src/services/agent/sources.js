// Сборка меток источников: по каким документам базы знаний собран ответ.
// Список строится кодом, а не моделью — иначе агент выдумывает названия
// файлов и ссылки, которых в контексте не было.

const KIND_LABELS = {
    topic: 'Тема',
    file: 'Файл',
    google_drive: 'Файл Google Drive',
};

const DEFAULT_NAME = 'Без названия';

/**
 * Схлопывает найденные фрагменты в список документов: несколько чанков одного
 * файла — это один источник, иначе в ответе будут дубли одной и той же ссылки.
 * Порядок сохраняется по релевантности первого встреченного фрагмента.
 *
 * @param {Array<{payload?: {text?: string, metadata?: Object}}>} chunks — точки Qdrant
 * @returns {Array<{index: number, kind: string, name: string, category?: string, link?: string, texts: string[]}>}
 */
function collectSources(chunks = []) {
    const byDocument = new Map();

    for (const chunk of chunks) {
        const text = chunk?.payload?.text;
        if (!text) continue;

        const metadata = chunk.payload.metadata ?? {};
        // Без идентификатора документа группируем по названию, а совсем
        // безымянный фрагмент остаётся отдельным источником
        const key = metadata.fileId || metadata.topicId || metadata.name || `chunk-${byDocument.size}`;
        const known = byDocument.get(key);

        if (known) {
            known.texts.push(text);
            continue;
        }

        byDocument.set(key, {
            index: byDocument.size + 1,
            kind: metadata.source,
            name: metadata.name || DEFAULT_NAME,
            category: metadata.category,
            link: metadata.link,
            texts: [text],
        });
    }

    return [...byDocument.values()];
}

/** Человекочитаемая подпись источника: «Файл: Регламент отпусков.pdf». */
function describeSource(source) {
    const label = KIND_LABELS[source.kind] || 'Источник';
    const category = source.kind === 'topic' && source.category ? ` (${source.category})` : '';
    return `${label}: ${source.name}${category}`;
}

/** Контекст для модели: документы пронумерованы, номера совпадают с метками в ответе. */
function buildContext(sources) {
    return sources
        .map(source => `[${source.index}] ${describeSource(source)}\n${source.texts.join('\n---\n')}`)
        .join('\n\n');
}

/** Номера источников, на которые модель сослалась в тексте ответа. */
function findCitedIndexes(answer, sources) {
    const known = new Set(sources.map(source => source.index));
    const cited = new Set();

    for (const [, number] of String(answer).matchAll(/\[(\d+)\]/g)) {
        const index = Number(number);
        if (known.has(index)) cited.add(index);
    }

    return cited;
}

/** Блок «Источники» в конце ответа: название документа и ссылка на него. */
function formatSources(sources) {
    const header = sources.length > 1 ? 'Источники:' : 'Источник:';

    const items = sources.map((source) => {
        const title = `[${source.index}] ${describeSource(source)}`;
        // Ссылка отдельной строкой — этого же требуют правила оформления ссылок
        return source.link ? `${title}\n${source.link}` : title;
    });

    return [header, ...items].join('\n');
}

/**
 * Дописывает к ответу метки источников. Если модель проставила ссылки [N] —
 * показываем только те документы, на которые она сослалась, иначе весь
 * контекст: ответ всё равно собран по нему.
 */
function attachSources(answer, sources) {
    const text = String(answer ?? '').trim();
    if (!sources.length || !text) return text;

    const cited = findCitedIndexes(text, sources);
    const used = cited.size ? sources.filter(source => cited.has(source.index)) : sources;

    return `${text}\n\n${formatSources(used)}`;
}

module.exports = { collectSources, buildContext, describeSource, formatSources, attachSources };
