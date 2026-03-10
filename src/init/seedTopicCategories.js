const TopicCategory = require('../models/topicCategory');

const defaultCategories = [
    {
        name: "Общие вопросы",
        description: "Базовая информация о компании, график работы и общие правила."
    },
    {
        name: "Техническая поддержка",
        description: "Инструкции по ПО, настройка доступов и решение проблем с оборудованием."
    },
    {
        name: "HR и Кадры",
        description: "Отпуска, больничные, оформление документов и корпоративная культура."
    },
    {
        name: "Продажи и Клиенты",
        description: "Скрипты продаж, работа с возражениями и регламенты взаимодействия с клиентами."
    },
    {
        name: "Безопасность",
        description: "Инструкции по информационной безопасности и правила доступа в офис."
    }
];

const seedTopicCategories = async () => {
    try {
        for (const category of defaultCategories) {
            await TopicCategory.findOneAndUpdate(
                { name: category.name },
                { $setOnInsert: category },
                {
                    upsert: true,
                    returnDocument: 'after', 
                    setDefaultsOnInsert: true
                }
            );
        }

        console.log('✅ Инициализация категорий знаний успешно завершена');
    } catch (error) {
        console.error('❌ Ошибка при сидировании категорий знаний:', error);
        throw error;
    }
};

module.exports = { seedTopicCategories };