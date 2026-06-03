const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

// ~800 tokens for Russian text (≈ 4 chars/token)
const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
    chunkSize: 3200,
    chunkOverlap: 200
});

async function getDoclingChunks(text) {
    const chunks = await splitter.splitText(text);
    if (!chunks.length) throw new Error('Chunker: чанки не получены');
    return chunks;
}

module.exports = { getDoclingChunks };
