const { z } = require('zod');
const { EDITABLE_KEYS, SETTINGS_MAP } = require('../constants/settings');

const settingValue = z.union([z.string(), z.number(), z.boolean()]);

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
