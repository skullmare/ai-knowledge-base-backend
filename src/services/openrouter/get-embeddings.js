const { OpenRouter } = require("@openrouter/sdk");
const { OPENROUTER_API_KEY } = process.env;
const openrouter = new OpenRouter({ apiKey: OPENROUTER_API_KEY });

async function getEmbeddings(chunks, model) {
    const response = await openrouter.embeddings.generate({
        requestBody: {
            model: model,
            input: chunks,
            encodingFormat: "float"
        }
    });
    return response.data;
}

module.exports = { getEmbeddings };