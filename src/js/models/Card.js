import { CONFIG } from '../config.js';

/**
 * カードモデルクラス
 */
export class Card {
    constructor(data = {}) {
        // バリデーション
        this.validateCardData(data);
        
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
        this.urls = data.urls || [];
        this.images = data.images || [];
        this.imageData = data.imageData || {};
    }

    /**
     * カードデータのバリデーション
     * @param {Object} data - カードデータ
     */
    validateCardData(data) {
        if (!data.question || data.question.trim() === '') {
            throw new Error('問題は必須です');
        }
        
        if (data.question.length > CONFIG.LIMITS.QUESTION_MAX_LENGTH) {
            throw new Error(`問題は${CONFIG.LIMITS.QUESTION_MAX_LENGTH}文字以内で入力してください`);
        }
        
        if (data.answer && data.answer.length > CONFIG.LIMITS.ANSWER_MAX_LENGTH) {
            throw new Error(`解答は${CONFIG.LIMITS.ANSWER_MAX_LENGTH}文字以内で入力してください`);
        }

        // URL配列のバリデーション
        if (data.urls && Array.isArray(data.urls)) {
            if (data.urls.length > CONFIG.LIMITS.URLS_MAX_COUNT) {
                throw new Error(`URLは${CONFIG.LIMITS.URLS_MAX_COUNT}個まで登録できます`);
            }
            
            data.urls.forEach((url, index) => {
                if (typeof url !== 'string' || url.trim() === '') {
                    throw new Error(`URL ${index + 1}が無効です`);
                }
                
                if (url.length > CONFIG.LIMITS.URL_MAX_LENGTH) {
                    throw new Error(`URL ${index + 1}は${CONFIG.LIMITS.URL_MAX_LENGTH}文字以内で入力してください`);
                }
                
                // 簡単なURL形式チェック
                try {
                    new URL(url);
                } catch (e) {
                    throw new Error(`URL ${index + 1}の形式が正しくありません`);
                }
            });
        }

        // 画像配列のバリデーション
        if (data.images && Array.isArray(data.images)) {
            if (data.images.length > CONFIG.LIMITS.IMAGES_MAX_COUNT) {
                throw new Error(`画像は${CONFIG.LIMITS.IMAGES_MAX_COUNT}個まで登録できます`);
            }
        }
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
     * カードの習得状態を切り替え
     */
    toggleCompletion() {
        if (this.completed) {
            this.markAsIncomplete();
        } else {
            this.markAsCompleted();
            this.reviewCount++;
        }
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
            relatedCards: this.relatedCards,
            urls: this.urls,
            images: this.images,
            imageData: this.imageData
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

    /**
     * URLを追加
     * @param {string} url - 追加するURL
     * @returns {boolean} 追加が成功したかどうか
     */
    addUrl(url) {
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error('有効なURLを入力してください');
        }

        const trimmedUrl = url.trim();
        
        // URL形式チェック
        try {
            new URL(trimmedUrl);
        } catch (e) {
            throw new Error('URLの形式が正しくありません');
        }

        // 長さチェック
        if (trimmedUrl.length > CONFIG.LIMITS.URL_MAX_LENGTH) {
            throw new Error(`URLは${CONFIG.LIMITS.URL_MAX_LENGTH}文字以内で入力してください`);
        }

        // 重複チェック
        if (this.urls.includes(trimmedUrl)) {
            throw new Error('このURLは既に登録されています');
        }

        // 上限チェック
        if (this.urls.length >= CONFIG.LIMITS.URLS_MAX_COUNT) {
            throw new Error(`URLは${CONFIG.LIMITS.URLS_MAX_COUNT}個まで登録できます`);
        }

        this.urls.push(trimmedUrl);
        this.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * URLを削除
     * @param {string} url - 削除するURL
     * @returns {boolean} 削除が成功したかどうか
     */
    removeUrl(url) {
        const index = this.urls.indexOf(url);
        if (index === -1) {
            return false;
        }

        this.urls.splice(index, 1);
        this.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * 画像を追加
     * @param {File} file - 画像ファイル
     * @returns {Promise<string>} 画像ID
     */
    async addImage(file) {
        if (!file || !(file instanceof File)) {
            throw new Error('有効な画像ファイルを選択してください');
        }

        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) {
            throw new Error('画像ファイルのみアップロード可能です');
        }

        // ファイルサイズチェック
        if (file.size > CONFIG.LIMITS.IMAGE_MAX_SIZE) {
            throw new Error(`画像ファイルは${CONFIG.LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB以下にしてください`);
        }

        // 上限チェック
        if (this.images.length >= CONFIG.LIMITS.IMAGES_MAX_COUNT) {
            throw new Error(`画像は${CONFIG.LIMITS.IMAGES_MAX_COUNT}個まで登録できます`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const imageInfo = {
                        id: imageId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        uploadedAt: new Date().toISOString()
                    };

                    this.images.push(imageInfo);
                    this.imageData[imageId] = e.target.result;
                    this.updatedAt = new Date().toISOString();
                    
                    resolve(imageId);
                } catch (error) {
                    reject(new Error('画像の処理中にエラーが発生しました'));
                }
            };

            reader.onerror = () => {
                reject(new Error('画像ファイルの読み込みに失敗しました'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * 画像を削除
     * @param {string} imageId - 画像ID
     * @returns {boolean} 削除が成功したかどうか
     */
    removeImage(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index === -1) {
            return false;
        }

        this.images.splice(index, 1);
        delete this.imageData[imageId];
        this.updatedAt = new Date().toISOString();
        return true;
    }

    /**
     * 画像データを取得
     * @param {string} imageId - 画像ID
     * @returns {string|null} 画像データ（Base64）
     */
    getImageData(imageId) {
        return this.imageData[imageId] || null;
    }

    /**
     * すべてのURLを取得
     * @returns {string[]} URL配列
     */
    getUrls() {
        return [...this.urls];
    }

    /**
     * すべての画像情報を取得
     * @returns {Object[]} 画像情報配列
     */
    getImages() {
        return [...this.images];
    }
}
