/**
 * テスト用モックデータ生成ユーティリティ
 */

/**
 * ランダムなカードデータを生成
 */
export class MockCardGenerator {
    static questionTemplates = [
        "JavaScriptで{topic}を実装する方法は？",
        "CSSで{topic}を設定するプロパティは？",
        "HTMLで{topic}を表現するタグは？",
        "{topic}の特徴を説明してください",
        "{topic}を使用する利点は何ですか？"
    ];

    static answerTemplates = [
        "{method}を使用します",
        "{property}: {value}",
        "<{tag}>{content}</{tag}>",
        "{description}という特徴があります",
        "{benefit}という利点があります"
    ];

    static topics = [
        "配列操作", "オブジェクト指向", "非同期処理", "DOM操作", "イベント処理",
        "Flexbox", "Grid", "アニメーション", "レスポンシブデザイン", "セレクタ",
        "セマンティック要素", "フォーム", "メタデータ", "アクセシビリティ", "SEO"
    ];

    static tags = [
        ["JavaScript", "基礎"], ["JavaScript", "応用"], ["CSS", "レイアウト"],
        ["CSS", "デザイン"], ["HTML", "構造"], ["HTML", "セマンティック"],
        ["フロントエンド", "基本"], ["Web開発", "実践"]
    ];

    /**
     * ランダムなカードを1つ生成
     */
    static generateCard(id = 1, options = {}) {
        const topic = this.getRandomItem(this.topics);
        const question = this.getRandomItem(this.questionTemplates).replace('{topic}', topic);
        const answer = this.generateAnswer(topic);
        const tagSet = this.getRandomItem(this.tags);
        
        const now = new Date();
        const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // 過去30日以内
        const updatedAt = new Date(createdAt.getTime() + Math.random() * (now.getTime() - createdAt.getTime()));
        
        const completed = options.completed !== undefined ? options.completed : Math.random() > 0.6;
        const completedAt = completed ? updatedAt : null;
        const reviewCount = completed ? Math.floor(Math.random() * 5) : 0;
        
        return {
            id,
            displayId: id,
            question: question.length > 50 ? question.substring(0, 47) + '...' : question,
            answer: answer.length > 200 ? answer.substring(0, 197) + '...' : answer,
            tags: tagSet,
            completed,
            favorite: Math.random() > 0.8,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
            completedAt: completedAt ? completedAt.toISOString() : null,
            reviewCount,
            nextReviewDate: this.generateNextReviewDate(completed, reviewCount),
            lastCompletedAt: completedAt ? completedAt.toISOString() : null,
            relatedCards: []
        };
    }

    /**
     * 複数のカードを生成
     */
    static generateCards(count = 10, options = {}) {
        const cards = [];
        for (let i = 1; i <= count; i++) {
            cards.push(this.generateCard(i, options));
        }
        return cards;
    }

    /**
     * 特定のシナリオ用のカードセットを生成
     */
    static generateScenarioCards(scenario) {
        switch (scenario) {
            case 'empty':
                return [];
            
            case 'single':
                return [this.generateCard(1)];
            
            case 'all-completed':
                return this.generateCards(5, { completed: true });
            
            case 'all-learning':
                return this.generateCards(5, { completed: false });
            
            case 'mixed':
                return [
                    this.generateCard(1, { completed: true }),
                    this.generateCard(2, { completed: false }),
                    this.generateCard(3, { completed: true }),
                    this.generateCard(4, { completed: false }),
                    this.generateCard(5, { completed: true })
                ];
            
            case 'search-test':
                return [
                    { ...this.generateCard(1), question: "JavaScript配列操作", answer: "map, filter, reduceを使用" },
                    { ...this.generateCard(2), question: "CSS Flexbox", answer: "柔軟なレイアウトシステム" },
                    { ...this.generateCard(3), question: "HTML セマンティック", answer: "意味のあるマークアップ" },
                    { ...this.generateCard(4), question: "React Hooks", answer: "関数コンポーネントで状態管理" }
                ];
            
            default:
                return this.generateCards(10);
        }
    }

    /**
     * プライベートヘルパーメソッド
     */
    static getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static generateAnswer(topic) {
        const methods = ["forEach", "map", "filter", "reduce", "find"];
        const properties = ["display", "position", "flex", "grid", "color"];
        const values = ["flex", "block", "center", "space-between", "#333"];
        const tags = ["div", "span", "section", "article", "header"];
        
        const templates = [
            `${this.getRandomItem(methods)}()メソッドを使用して${topic}を処理します`,
            `${this.getRandomItem(properties)}: ${this.getRandomItem(values)}を設定します`,
            `<${this.getRandomItem(tags)}>要素を使用して${topic}を表現します`
        ];
        
        return this.getRandomItem(templates);
    }

    static generateNextReviewDate(completed, reviewCount) {
        if (!completed || reviewCount === 0) return null;
        
        const intervals = [1, 3, 7, 14, 30]; // 日数
        const interval = intervals[Math.min(reviewCount - 1, intervals.length - 1)];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);
        
        return nextDate.toISOString();
    }
}

/**
 * 設定データのモック生成
 */
export class MockSettingsGenerator {
    static generateSettings(options = {}) {
        return {
            forgettingSettings: {
                enabled: options.forgettingEnabled !== undefined ? options.forgettingEnabled : true,
                reviewCount: options.reviewCount || 3,
                intervals: options.intervals || [1, 3, 7],
                notificationEnabled: options.notificationEnabled !== undefined ? options.notificationEnabled : true
            },
            flashcardSettings: {
                flashcardMode: options.flashcardMode !== undefined ? options.flashcardMode : true,
                expandAll: options.expandAll !== undefined ? options.expandAll : false
            },
            darkModeSettings: {
                enabled: options.darkMode !== undefined ? options.darkMode : false
            },
            sortSettings: {
                sortBy: options.sortBy || 'createdAt',
                sortOrder: options.sortOrder || 'desc'
            }
        };
    }

    static generateForgettingSettings(reviewCount = 3) {
        const intervals = [];
        for (let i = 0; i < reviewCount; i++) {
            intervals.push(Math.pow(2, i)); // 1, 2, 4, 8, 16...
        }
        
        return {
            enabled: true,
            reviewCount,
            intervals,
            notificationEnabled: true
        };
    }
}

/**
 * イベントデータのモック生成
 */
export class MockEventGenerator {
    static createMouseEvent(type, options = {}) {
        return new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            ...options
        });
    }

    static createKeyboardEvent(type, key, options = {}) {
        return new KeyboardEvent(type, {
            key,
            bubbles: true,
            cancelable: true,
            ...options
        });
    }

    static createInputEvent(value) {
        const event = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        event.target = { value };
        return event;
    }
}

/**
 * テスト用のユーティリティ関数
 */
export class MockUtils {
    /**
     * 指定した時間だけ待機
     */
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ランダムな文字列を生成
     */
    static randomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * ランダムな日付を生成
     */
    static randomDate(start = new Date(2024, 0, 1), end = new Date()) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    /**
     * 配列をシャッフル
     */
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
