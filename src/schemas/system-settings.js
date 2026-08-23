const { z } = require('zod');
const { EDITABLE_KEYS, SETTINGS_MAP } = require('../constants/settings');

const settingValue = z.union([z.string(), z.number(), z.boolean()]);

// Числовые настройки, у которых нулевое значение ломает поведение системы
const NUMERIC_BOUNDS = {
    ai_embedding_dimensions: { min: 1, max: 8192, label: 'Размерность векторов' },
    agent_search_limit: { min: 1, max: 50, label: 'Количество фрагментов в контексте' },
    logs_ttl_days: { min: 1, max: 3650, label: 'Срок хранения логов' },
};

const updateSettingsSchema = z.object({
    body: z.object({
        settings: z.record(z.string(), settingValue)
            .refine(obj => Object.keys(obj).length > 0, 'Не передано ни одной настройки')
            .superRefine((obj, ctx) => {
                for (const key of Object.keys(obj)) {
                    if (!SETTINGS_MAP[key]) {
                        ctx.addIssue({ code: 'custom', path: [key], message: `Неизвестная настройка «${key}»` });
                        continue;
                    }

                    if (!EDITABLE_KEYS.includes(key)) {
                        ctx.addIssue({ code: 'custom', path: [key], message: `Настройка «${key}» изменяется системой` });
                        continue;
                    }

                    const bounds = NUMERIC_BOUNDS[key];
                    if (!bounds) continue;

                    const value = Number(obj[key]);
                    if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) {
                        ctx.addIssue({
                            code: 'custom',
                            path: [key],
                            message: `«${bounds.label}» — целое число от ${bounds.min} до ${bounds.max}`
                        });
                    }
                }
            })
    })
});

const testConnectionSchema = z.object({
    body: z.object({
        apiKey: z.string().trim().min(1).optional(),
        baseURL: z.string().trim().url('Некорректный адрес API').optional(),
    })
});

module.exports = { updateSettingsSchema, testConnectionSchema };
