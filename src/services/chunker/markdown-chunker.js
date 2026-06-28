const { MarkdownTextSplitter } = require('@langchain/textsplitters');

const splitter = new MarkdownTextSplitter({
    chunkSize: 800,
    chunkOverlap: 80
});

async function getMarkdownChunks(text) {
    const chunks = await splitter.splitText(text);
    if (!chunks.length) throw new Error('Chunker: чанки не получены');
    return chunks;
}

module.exports = { getMarkdownChunks };
