import { Card } from '../models/Card.js';
import { CONFIG } from '../config.js';
import { getFromStorage, saveToStorage } from '../utils.js';

/**
 * カードサービスクラス
 */
export class CardService {
    constructor() {
        this.cards = [];
        this.maxDisplayId = 0;
        this.loadCards();
    }

    /**
     * カードをローカルストレージから読み込み
     */
    loadCards() {
        const cardsData = getFromStorage(CONFIG.STORAGE_KEYS.FLASHCARDS, []);
        this.cards = cardsData.map(data => Card.fromJSON(data));
        
        // displayIdが設定されていないカードに設定
        this.initializeDisplayIds();
    }

    /**
     * displayIdを初期化
     */
    initializeDisplayIds() {
        let nextId = 1;
        this.cards.forEach(card => {
            if (!card.displayId || card.displayId === 0) {
                card.displayId = nextId++;
            }
        });

        this.maxDisplayId = this.cards.reduce((max, card) => {
            return card.displayId > max ? card.displayId : max;
        }, 0);
    }

    /**
     * カードをローカルストレージに保存
     */
    saveCards() {
        const cardsData = this.cards.map(card => card.toJSON());
        saveToStorage(CONFIG.STORAGE_KEYS.FLASHCARDS, cardsData);
    }

    /**
     * 新しいカードを追加
     * @param {Object} cardData - カードデータ
     * @returns {Card} 追加されたカード
     */
    addCard(cardData) {
        this.maxDisplayId++;
        const card = new Card({
            ...cardData,
            displayId: this.maxDisplayId
        });

        this.cards.unshift(card);
        this.saveCards();
        return card;
    }

    /**
     * カードを更新
     * @param {number} id - カードID
     * @param {Object} updates - 更新データ
     * @returns {Card|null} 更新されたカード
     */
    updateCard(id, updates) {
        const card = this.getCardById(id);
        if (!card) {
            throw new Error(`ID ${id} のカードが見つかりません`);
        }
        card.update(updates);
        this.saveCards();
        return card;
    }

    /**
     * カードを削除
     * @param {number} id - カードID
     * @returns {boolean} 削除が成功したかどうか
     */
    deleteCard(id) {
        const index = this.cards.findIndex(card => card.id === id);
        if (index === -1) {
            throw new Error(`ID ${id} のカードが見つかりません`);
        }
        const deletedCard = this.cards.splice(index, 1)[0];
        this.saveCards();
        return deletedCard;
    }

    /**
     * IDでカードを取得（テスト用エイリアス）
     * @param {number} id カードID
     * @returns {Card|null} カード
     */
    getCard(id) {
        return this.getCardById(id);
    }

    /**
     * カードを検索
     * @param {string} searchTerm 検索語
     * @returns {Card[]} 検索結果のカード配列
     */
    searchCards(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }
        
        return this.cards.filter(card => card.matchesSearch(searchTerm));
    }

    /**
     * 習得状態でカードを取得
     * @param {boolean} completed 習得状態
     * @returns {Card[]} 指定した習得状態のカード配列
     */
    getCardsByStatus(completed) {
        return this.cards.filter(card => card.completed === completed);
    }

    /**
     * IDでカードを取得
     * @param {number} id - カードID
     * @returns {Card|null} カード
     */
    getCardById(id) {
        return this.cards.find(card => card.id === id) || null;
    }

    /**
     * すべてのカードを取得
     * @returns {Card[]} カードの配列
     */
    getAllCards() {
        return [...this.cards];
    }

    /**
     * フィルタリングされたカードを取得
     * @param {Object} filters - フィルター条件
     * @returns {Card[]} フィルタリングされたカードの配列
     */
    getFilteredCards(filters = {}) {
        let filteredCards = [...this.cards];

        // 検索フィルター
        if (filters.searchQuery) {
            filteredCards = filteredCards.filter(card => 
                card.matchesSearch(filters.searchQuery)
            );
        }

        // タグフィルター
        if (filters.selectedTags && filters.selectedTags.length > 0) {
            filteredCards = filteredCards.filter(card => 
                card.hasAllTags(filters.selectedTags)
            );
        }

        // 状態フィルター
        switch (filters.status) {
            case 'active':
                filteredCards = filteredCards.filter(card => !card.completed);
                break;
            case 'completed':
                filteredCards = filteredCards.filter(card => card.completed);
                break;
            case 'favorites':
                filteredCards = filteredCards.filter(card => card.favorite);
                break;
        }

        // ソート
        if (filters.sortField && filters.sortDirection) {
            filteredCards = Card.sortCards(
                filteredCards, 
                filters.sortField, 
                filters.sortDirection
            );
        }

        return filteredCards;
    }

    /**
     * カードの完了状態を切り替え
     * @param {number} id - カードID
     * @returns {Card|null} 更新されたカード
     */
    toggleCardCompletion(id) {
        const card = this.getCardById(id);
        if (card) {
            if (card.completed) {
                card.markAsIncomplete();
            } else {
                card.markAsCompleted();
            }
            this.saveCards();
        }
        return card;
    }

    /**
     * カードのお気に入り状態を切り替え
     * @param {number} id - カードID
     * @returns {Card|null} 更新されたカード
     */
    toggleCardFavorite(id) {
        const card = this.getCardById(id);
        if (card) {
            card.toggleFavorite();
            this.saveCards();
        }
        return card;
    }

    /**
     * 習得済みカードをすべて削除
     * @returns {number} 削除されたカードの数
     */
    clearCompletedCards() {
        const completedCount = this.cards.filter(card => card.completed).length;
        this.cards = this.cards.filter(card => !card.completed);
        this.saveCards();
        return completedCount;
    }

    /**
     * すべてのタグを取得
     * @returns {string[]} タグの配列
     */
    getAllTags() {
        const tagsSet = new Set();
        this.cards.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
                card.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }

    /**
     * 統計情報を取得
     * @returns {Object} 統計情報
     */
    getStats() {
        const totalCount = this.cards.length;
        const activeCount = this.cards.filter(card => !card.completed).length;
        const completedCount = totalCount - activeCount;
        const favoriteCount = this.cards.filter(card => card.favorite).length;

        return {
            total: totalCount,
            active: activeCount,
            completed: completedCount,
            favorite: favoriteCount
        };
    }

    /**
     * 復習が必要なカードを取得
     * @returns {Card[]} 復習が必要なカードの配列
     */
    getCardsNeedingReview() {
        return this.cards.filter(card => card.needsReview());
    }

    /**
     * 忘却曲線をチェックして復習が必要なカードを学習中に戻す
     * @param {Object} forgettingSettings - 忘却曲線設定
     * @returns {number} 復習に戻されたカードの数
     */
    checkForgettingCurve(forgettingSettings) {
        let reviewedCount = 0;

        this.cards.forEach(card => {
            if (card.needsReview()) {
                card.markAsIncomplete();
                card.scheduleNextReview(
                    forgettingSettings.intervals, 
                    forgettingSettings.reviewCount
                );
                reviewedCount++;
            }
        });

        if (reviewedCount > 0) {
            this.saveCards();
        }

        return reviewedCount;
    }

    /**
     * カードに次の復習をスケジュール
     * @param {number} id - カードID
     * @param {Object} forgettingSettings - 忘却曲線設定
     * @returns {Card|null} 更新されたカード
     */
    scheduleCardReview(id, forgettingSettings) {
        const card = this.getCardById(id);
        if (card && card.completed) {
            card.scheduleNextReview(
                forgettingSettings.intervals, 
                forgettingSettings.reviewCount
            );
            this.saveCards();
        }
        return card;
    }

    /**
     * 関連カードを設定（双方向）
     * @param {number} cardId - メインカードのID
     * @param {number[]} relatedCardIds - 関連カードのIDの配列
     */
    setRelatedCards(cardId, relatedCardIds) {
        const card = this.getCardById(cardId);
        if (!card) return;

        // 以前の関連カードから現在のカードへの参照を削除
        if (card.relatedCards && Array.isArray(card.relatedCards)) {
            card.relatedCards.forEach(oldRelatedId => {
                const oldRelatedCard = this.getCardById(oldRelatedId);
                if (oldRelatedCard && oldRelatedCard.relatedCards) {
                    oldRelatedCard.relatedCards = oldRelatedCard.relatedCards.filter(
                        id => id !== cardId
                    );
                }
            });
        }

        // 現在のカードに新しい関連カードを設定
        card.relatedCards = [...relatedCardIds];

        // 選択された関連カードにも現在のカードを関連付け（双方向）
        relatedCardIds.forEach(relatedId => {
            const relatedCard = this.getCardById(relatedId);
            if (relatedCard) {
                if (!relatedCard.relatedCards) {
                    relatedCard.relatedCards = [];
                }
                if (!relatedCard.relatedCards.includes(cardId)) {
                    relatedCard.relatedCards.push(cardId);
                }
            }
        });

        this.saveCards();
    }
}
