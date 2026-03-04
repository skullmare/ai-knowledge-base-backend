const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const { qdrantClient } = require('../../config/qdrant');
const { OpenRouter } = require("@openrouter/sdk");

const { DOCLING_URL, OPENROUTER_API_KEY } = process.env;
const COLLECTION_NAME = "knowledge_base";

const openrouter = new OpenRouter({ apiKey: OPENROUTER_API_KEY });

async function deleteTopicFromQdrant(topicId) {
    return qdrantClient.delete(COLLECTION_NAME, {
        filter: {
            must: [{ key: "metadata.topicId", match: { value: topicId.toString() } }]
        }
    });
}

async function getDoclingChunks(text) {
    const formData = new FormData();
    formData.append('files', Buffer.from(text), { filename: 'content.md', contentType: 'text/markdown' });
    formData.append('chunking_max_tokens', '800');
    formData.append('chunking_merge_peers', 'true');

    const { data } = await axios.post(`${DOCLING_URL}/v1/chunk/hybrid/file`, formData, {
        headers: formData.getHeaders()
    });

    if (!data?.chunks?.length) throw new Error('Docling: чанки не получены');
    return data.chunks.map(c => c.text || c.raw_text).filter(Boolean);
}

async function getEmbeddings(chunks) {
    const response = await openrouter.embeddings.generate({
        requestBody: {
            model: "openai/text-embedding-3-small",
            input: chunks,
            encodingFormat: "float"
        }
    });
    return response.data;
}

async function syncTopicToQdrant(topic) {
    const topicId = topic._id.toString();
    
    await deleteTopicFromQdrant(topicId);

    let content = topic.content;
    if (topic.files?.length) {
        const filesMd = topic.files.map((f, i) => `${i + 1}) ${f.name}: ${f.description}. [Link](${f.url})`).join('\n\n');
        content += `\n\nДополнительные материалы:\n\n${filesMd}`;
    }

    const chunks = await getDoclingChunks(content);
    const embeddings = await getEmbeddings(chunks);

    const points = embeddings.map((item, i) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: chunks[i],
            metadata: {
                topicId,
                name: topic.name,
                category: topic.metadata.category?._id?.toString() || topic.metadata.category?.toString(),
                accessibleByRoles: (topic.metadata.accessibleByRoles || []).map(r => r.toString()),
                files: (topic.files || []).map(f => ({ url: f.url, description: f.description }))
            }
        }
    }));

    return qdrantClient.upsert(COLLECTION_NAME, { wait: true, points });
}

module.exports = { syncTopicToQdrant, deleteTopicFromQdrant };