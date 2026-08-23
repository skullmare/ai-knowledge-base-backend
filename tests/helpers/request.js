const request = require('supertest');
const app = require('../../src/app');
const authService = require('../../src/services/auth');
const { createPlatformRole, createPlatformUser } = require('./factories');

const accessTokenFor = (user) =>
    authService.generateTokens({ id: user._id.toString(), role: user.role }).accessToken;

// Пользователь ровно с нужным набором прав: так тесты проверяют
// и happy path, и отказ по правам, не подменяя middleware.
const createAuthenticatedUser = async ({ permissions, ...overrides } = {}) => {
    const role = permissions
        ? await createPlatformRole({ permissions })
        : await createPlatformRole();

    const { user, plainPassword } = await createPlatformUser({ role: role._id, ...overrides });

    return { user, role, plainPassword, token: accessTokenFor(user) };
};

const authRequest = (token) => {
    const agent = request(app);
    const withAuth = (method) => (url) => agent[method](url).set('Authorization', `Bearer ${token}`);

    return {
        get: withAuth('get'),
        post: withAuth('post'),
        patch: withAuth('patch'),
        put: withAuth('put'),
        delete: withAuth('delete')
    };
};

module.exports = { app, request, accessTokenFor, createAuthenticatedUser, authRequest };
