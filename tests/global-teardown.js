module.exports = async () => {
    await globalThis.__MONGO_INSTANCE__?.stop();
};
