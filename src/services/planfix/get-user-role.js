const axios = require('axios');

const PLANFIX_API_URL = 'https://operon.planfix.ru/rest/user/list';

const KNOWN_ROLES = new Set(['Администратор', 'Оператор', 'Застройщик', 'Партнер']);

function normalizeRole(raw) {
    const normalized = raw
        .trim()
        .toLowerCase()
        .replace(/ё/g, 'е');
    const titled = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return KNOWN_ROLES.has(titled) ? titled : null;
}

async function getPlanfixUserRole(phone) {
    const token = process.env.PLANFIX_API_TOKEN;
    if (!token) return null;

    try {
        const response = await axios.post(
            PLANFIX_API_URL,
            {
                offset: 0,
                pageSize: 1,
                fields: 'id,name,lastname,phones,position',
                filters: [{ type: 9002, operator: 'equal', value: phone }]
            },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        const users = response.data?.users;
        if (!users || users.length === 0) return null;

        const positionName = users[0].position?.name;
        if (!positionName) return null;

        return normalizeRole(positionName);
    } catch {
        return null;
    }
}

module.exports = { getPlanfixUserRole };
