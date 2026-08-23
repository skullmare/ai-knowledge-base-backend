const { MongoMemoryServer } = require('mongodb-memory-server');

// Один экземпляр Mongo на весь прогон: поднимать его в каждом файле
// дороже самих тестов.
module.exports = async () => {
    const mongo = await MongoMemoryServer.create();

    globalThis.__MONGO_INSTANCE__ = mongo;
    process.env.MONGO_URI_TEST = mongo.getUri('knowledge-base-test');
};
