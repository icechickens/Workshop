/**
 * アプリケーション設定
 */
export const CONFIG = {
    // ローカルストレージキー
    STORAGE_KEYS: {
        FLASHCARDS: 'flashcards',
        FORGETTING_SETTINGS: 'forgettingSettings',
        FLASHCARD_SETTINGS: 'flashcardSettings',
        DARK_MODE_SETTINGS: 'darkModeSettings',
        SORT_SETTINGS: 'sortSettings'
    },

    // デフォルト設定
    DEFAULTS: {
        FORGETTING_SETTINGS: {
            enabled: true,
            reviewCount: 5,
            intervals: [1, 3, 7, 14, 30],
            notifications: true
        },
        FLASHCARD_SETTINGS: {
            enabled: true
        },
        DARK_MODE_SETTINGS: {
            enabled: false
        },
        SORT_SETTINGS: {
            field: 'createdAt',
            direction: 'desc'
        }
    },

    // 制限値
    LIMITS: {
        QUESTION_MAX_LENGTH: 50,
        ANSWER_MAX_LENGTH: 200,
        TAGS_MAX_LENGTH: 100,
        REVIEW_COUNT_MIN: 1,
        REVIEW_COUNT_MAX: 10,
        URLS_MAX_COUNT: 10,
        IMAGES_MAX_COUNT: 2,
        URL_MAX_LENGTH: 500,
        IMAGE_MAX_SIZE: 5 * 1024 * 1024 // 5MB
    },

    // UI設定
    UI: {
        NOTIFICATION_DURATION: 3000,
        ANIMATION_DURATION: 300,
        SEARCH_DEBOUNCE: 300
    }
};
