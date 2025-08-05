import { CONFIG } from '../config.js';
import { getFromStorage, saveToStorage } from '../utils.js';

/**
 * 設定サービスクラス
 */
export class SettingsService {
    constructor() {
        this.forgettingSettings = getFromStorage(
            CONFIG.STORAGE_KEYS.FORGETTING_SETTINGS, 
            CONFIG.DEFAULTS.FORGETTING_SETTINGS
        );
        
        this.flashcardSettings = getFromStorage(
            CONFIG.STORAGE_KEYS.FLASHCARD_SETTINGS, 
            CONFIG.DEFAULTS.FLASHCARD_SETTINGS
        );
        
        this.darkModeSettings = getFromStorage(
            CONFIG.STORAGE_KEYS.DARK_MODE_SETTINGS, 
            CONFIG.DEFAULTS.DARK_MODE_SETTINGS
        );
        
        this.sortSettings = getFromStorage(
            CONFIG.STORAGE_KEYS.SORT_SETTINGS, 
            CONFIG.DEFAULTS.SORT_SETTINGS
        );
    }

    /**
     * 忘却曲線設定を取得
     * @returns {Object} 忘却曲線設定
     */
    getForgettingSettings() {
        return { ...this.forgettingSettings };
    }

    /**
     * 忘却曲線設定を更新
     * @param {Object} updates - 更新データ
     */
    updateForgettingSettings(updates) {
        this.forgettingSettings = { ...this.forgettingSettings, ...updates };
        saveToStorage(CONFIG.STORAGE_KEYS.FORGETTING_SETTINGS, this.forgettingSettings);
    }

    /**
     * フラッシュカード設定を取得
     * @returns {Object} フラッシュカード設定
     */
    getFlashcardSettings() {
        return { ...this.flashcardSettings };
    }

    /**
     * フラッシュカード設定を更新
     * @param {Object} updates - 更新データ
     */
    updateFlashcardSettings(updates) {
        this.flashcardSettings = { ...this.flashcardSettings, ...updates };
        saveToStorage(CONFIG.STORAGE_KEYS.FLASHCARD_SETTINGS, this.flashcardSettings);
    }

    /**
     * ダークモード設定を取得
     * @returns {Object} ダークモード設定
     */
    getDarkModeSettings() {
        return { ...this.darkModeSettings };
    }

    /**
     * ダークモード設定を更新
     * @param {Object} updates - 更新データ
     */
    updateDarkModeSettings(updates) {
        this.darkModeSettings = { ...this.darkModeSettings, ...updates };
        saveToStorage(CONFIG.STORAGE_KEYS.DARK_MODE_SETTINGS, this.darkModeSettings);
    }

    /**
     * ソート設定を取得
     * @returns {Object} ソート設定
     */
    getSortSettings() {
        return { ...this.sortSettings };
    }

    /**
     * ソート設定を更新
     * @param {Object} updates - 更新データ
     */
    updateSortSettings(updates) {
        this.sortSettings = { ...this.sortSettings, ...updates };
        saveToStorage(CONFIG.STORAGE_KEYS.SORT_SETTINGS, this.sortSettings);
    }

    /**
     * ダークモードを切り替え
     * @returns {boolean} 新しいダークモード状態
     */
    toggleDarkMode() {
        const newState = !this.darkModeSettings.enabled;
        this.updateDarkModeSettings({ enabled: newState });
        return newState;
    }

    /**
     * ソート順を変更
     * @param {string} field - ソートフィールド
     * @returns {Object} 新しいソート設定
     */
    changeSortOrder(field) {
        let newSettings;
        
        if (field === this.sortSettings.field) {
            // 同じフィールドがクリックされた場合は方向を切り替え
            newSettings = {
                ...this.sortSettings,
                direction: this.sortSettings.direction === 'asc' ? 'desc' : 'asc'
            };
        } else {
            // 新しいフィールドの場合はそのフィールドで降順に設定
            newSettings = {
                field: field,
                direction: 'desc'
            };
        }
        
        this.updateSortSettings(newSettings);
        return newSettings;
    }

    /**
     * 設定をデフォルトにリセット
     */
    resetToDefaults() {
        this.forgettingSettings = { ...CONFIG.DEFAULTS.FORGETTING_SETTINGS };
        this.flashcardSettings = { ...CONFIG.DEFAULTS.FLASHCARD_SETTINGS };
        this.darkModeSettings = { ...CONFIG.DEFAULTS.DARK_MODE_SETTINGS };
        this.sortSettings = { ...CONFIG.DEFAULTS.SORT_SETTINGS };

        saveToStorage(CONFIG.STORAGE_KEYS.FORGETTING_SETTINGS, this.forgettingSettings);
        saveToStorage(CONFIG.STORAGE_KEYS.FLASHCARD_SETTINGS, this.flashcardSettings);
        saveToStorage(CONFIG.STORAGE_KEYS.DARK_MODE_SETTINGS, this.darkModeSettings);
        saveToStorage(CONFIG.STORAGE_KEYS.SORT_SETTINGS, this.sortSettings);
    }

    /**
     * 復習間隔を動的に生成
     * @param {number} reviewCount - 復習回数
     * @returns {number[]} 復習間隔の配列
     */
    generateIntervals(reviewCount) {
        const intervals = [];
        for (let i = 0; i < reviewCount; i++) {
            if (i < this.forgettingSettings.intervals.length) {
                intervals.push(this.forgettingSettings.intervals[i]);
            } else {
                // 既存の間隔がない場合は、前回の間隔の2倍を設定（最低7日）
                const prevInterval = i > 0 ? intervals[i - 1] : 7;
                let newInterval = Math.max(7, prevInterval * 2);
                
                // 回数に応じて最大値を調整
                if (i < 2) newInterval = Math.min(newInterval, 30);
                else if (i < 4) newInterval = Math.min(newInterval, 60);
                else if (i < 6) newInterval = Math.min(newInterval, 90);
                else newInterval = Math.min(newInterval, 180);
                
                intervals.push(newInterval);
            }
        }
        return intervals;
    }

    /**
     * 設定の妥当性をチェック
     * @param {Object} settings - チェックする設定
     * @param {string} type - 設定タイプ
     * @returns {boolean} 妥当かどうか
     */
    validateSettings(settings, type) {
        switch (type) {
            case 'forgetting':
                return this.validateForgettingSettings(settings);
            case 'flashcard':
                return this.validateFlashcardSettings(settings);
            case 'darkMode':
                return this.validateDarkModeSettings(settings);
            case 'sort':
                return this.validateSortSettings(settings);
            default:
                return false;
        }
    }

    /**
     * 忘却曲線設定の妥当性をチェック
     * @param {Object} settings - 忘却曲線設定
     * @returns {boolean} 妥当かどうか
     */
    validateForgettingSettings(settings) {
        if (typeof settings.enabled !== 'boolean') return false;
        if (typeof settings.notifications !== 'boolean') return false;
        
        const reviewCount = parseInt(settings.reviewCount);
        if (isNaN(reviewCount) || 
            reviewCount < CONFIG.LIMITS.REVIEW_COUNT_MIN || 
            reviewCount > CONFIG.LIMITS.REVIEW_COUNT_MAX) {
            return false;
        }

        if (!Array.isArray(settings.intervals)) return false;
        
        return settings.intervals.every(interval => {
            const num = parseInt(interval);
            return !isNaN(num) && num > 0 && num <= 180;
        });
    }

    /**
     * フラッシュカード設定の妥当性をチェック
     * @param {Object} settings - フラッシュカード設定
     * @returns {boolean} 妥当かどうか
     */
    validateFlashcardSettings(settings) {
        return typeof settings.enabled === 'boolean';
    }

    /**
     * ダークモード設定の妥当性をチェック
     * @param {Object} settings - ダークモード設定
     * @returns {boolean} 妥当かどうか
     */
    validateDarkModeSettings(settings) {
        return typeof settings.enabled === 'boolean';
    }

    /**
     * ソート設定の妥当性をチェック
     * @param {Object} settings - ソート設定
     * @returns {boolean} 妥当かどうか
     */
    validateSortSettings(settings) {
        const validFields = ['createdAt', 'updatedAt'];
        const validDirections = ['asc', 'desc'];
        
        return validFields.includes(settings.field) && 
               validDirections.includes(settings.direction);
    }
}
