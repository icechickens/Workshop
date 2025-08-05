/**
 * カードモデルクラス
 */
export class Card {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.displayId = data.displayId || 0;
        this.question = data.question || '';
        this.answer = data.answer || '';
        this.tags = data.tags || [];
        this.completed = data.completed || false;
        this.favorite = data.favorite || false;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || null;
        this.completedAt = data.completedAt || null;
        this.reviewCount = data.reviewCount || 0;
        this.nextReviewDate = data.nextReviewDate || null;
        this.lastCompletedAt = data.lastCompletedAt || null;
        this.relatedCards = data.relatedCards || [];
    }

    /**
     * カードを更新
     * @param {Object} updates - 更新データ
     */
    update(updates) {
        Object.assign(this, updates);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * カードを完了状態に設定
     */
    markAsCompleted() {
        this.completed = true;
        this.completedAt = new Date().toISOString();
        this.lastCompletedAt = new Date().toISOString();
    }

    /**
     * カードを未完了状態に設定
     */
    markAsIncomplete() {
        this.completed = false;
        this.completedAt = null;
        this.nextReviewDate = null;
    }

    /**
     * お気に入り状態を切り替え
     */
    toggleFavorite() {
        this.favorite = !this.favorite;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 次の復習日をスケジュール
     * @param {number[]} intervals - 復習間隔の配列
     * @param {number} maxReviewCount - 最大復習回数
     */
    scheduleNextReview(intervals, maxReviewCount) {
        if (this.reviewCount >= maxReviewCount) {
            this.nextReviewDate = null;
            return;
        }

        const intervalDays = intervals[this.reviewCount] || intervals[intervals.length - 1];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

        this.nextReviewDate = nextReviewDate.toISOString();
        this.reviewCount++;
    }

    /**
     * 復習が必要かチェック
     * @returns {boolean} 復習が必要かどうか
     */
    needsReview() {
        if (!this.completed || !this.nextReviewDate) {
            return false;
        }

        const now = new Date();
        const reviewDate = new Date(this.nextReviewDate);
        return now >= reviewDate;
    }

    /**
     * カードが検索クエリにマッチするかチェック
     * @param {string} query - 検索クエリ
     * @returns {boolean} マッチするかどうか
     */
    matchesSearch(query) {
        if (!query) return true;

        // #で始まる場合はIDの完全一致検索
        if (query.startsWith('#')) {
            const idQuery = query.substring(1);
            if (!idQuery) return false;
            return this.displayId && this.displayId.toString() === idQuery;
        }

        // 通常の検索
        const searchTerm = query.toLowerCase();
        const questionMatch = this.question.toLowerCase().includes(searchTerm);
        const answerMatch = this.answer && this.answer.toLowerCase().includes(searchTerm);
        const tagMatch = this.tags && Array.isArray(this.tags) && 
            this.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        return questionMatch || answerMatch || tagMatch;
    }

    /**
     * カードが指定されたタグを含むかチェック
     * @param {string[]} selectedTags - 選択されたタグの配列
     * @returns {boolean} タグを含むかどうか
     */
    hasAllTags(selectedTags) {
        if (!selectedTags.length) return true;
        if (!this.tags || !Array.isArray(this.tags)) return false;

        return selectedTags.every(tag => this.tags.includes(tag));
    }

    /**
     * カードをプレーンオブジェクトに変換
     * @returns {Object} プレーンオブジェクト
     */
    toJSON() {
        return {
            id: this.id,
            displayId: this.displayId,
            question: this.question,
            answer: this.answer,
            tags: this.tags,
            completed: this.completed,
            favorite: this.favorite,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            completedAt: this.completedAt,
            reviewCount: this.reviewCount,
            nextReviewDate: this.nextReviewDate,
            lastCompletedAt: this.lastCompletedAt,
            relatedCards: this.relatedCards
        };
    }

    /**
     * プレーンオブジェクトからCardインスタンスを作成
     * @param {Object} data - プレーンオブジェクト
     * @returns {Card} Cardインスタンス
     */
    static fromJSON(data) {
        return new Card(data);
    }

    /**
     * カードの配列をソート
     * @param {Card[]} cards - カードの配列
     * @param {string} field - ソートフィールド
     * @param {string} direction - ソート方向（asc/desc）
     * @returns {Card[]} ソートされたカードの配列
     */
    static sortCards(cards, field, direction) {
        return [...cards].sort((a, b) => {
            let valueA, valueB;

            switch (field) {
                case 'createdAt':
                    valueA = new Date(a.createdAt).getTime();
                    valueB = new Date(b.createdAt).getTime();
                    break;
                case 'updatedAt':
                    valueA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
                    valueB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
                    break;
                default:
                    valueA = new Date(a.createdAt).getTime();
                    valueB = new Date(b.createdAt).getTime();
            }

            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        });
    }
}
