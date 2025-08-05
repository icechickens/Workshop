/**
 * ユーティリティ関数
 */

/**
 * HTMLエスケープ
 * @param {string} text - エスケープするテキスト
 * @returns {string} エスケープされたテキスト
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * テキストをハイライト
 * @param {string} text - ハイライトするテキスト
 * @param {string} query - 検索クエリ
 * @returns {string} ハイライトされたHTML
 */
export function highlightText(text, query) {
    if (!query || !text) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * タグを処理する（カンマ区切りのタグを配列に変換し、重複を排除）
 * @param {string} tagsText - カンマ区切りのタグテキスト
 * @returns {string[]} 処理されたタグの配列
 */
export function processTags(tagsText) {
    return [...new Set(tagsText.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '')
        .map(tag => tag.toLowerCase()))];
}

/**
 * 日付を日本語形式でフォーマット
 * @param {string|Date} date - フォーマットする日付
 * @returns {string} フォーマットされた日付文字列
 */
export function formatDate(date) {
    return new Date(date).toLocaleDateString('ja-JP');
}

/**
 * デバウンス関数
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 通知を表示
 * @param {string} message - 通知メッセージ
 * @param {string} type - 通知タイプ（success, error, info）
 */
export function showNotification(message, type = 'info') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // アニメーション後に削除
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

/**
 * 要素のアニメーション完了を待つ
 * @param {HTMLElement} element - アニメーション対象の要素
 * @param {string} animationName - アニメーション名
 * @returns {Promise} アニメーション完了のPromise
 */
export function waitForAnimation(element, animationName) {
    return new Promise((resolve) => {
        const handleAnimationEnd = (event) => {
            if (event.animationName === animationName) {
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            }
        };
        element.addEventListener('animationend', handleAnimationEnd);
    });
}

/**
 * ローカルストレージからデータを取得
 * @param {string} key - ストレージキー
 * @param {*} defaultValue - デフォルト値
 * @returns {*} 取得されたデータ
 */
export function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Failed to get item from localStorage: ${key}`, error);
        return defaultValue;
    }
}

/**
 * ローカルストレージにデータを保存
 * @param {string} key - ストレージキー
 * @param {*} value - 保存する値
 */
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Failed to save item to localStorage: ${key}`, error);
    }
}

/**
 * 要素が存在するかチェック
 * @param {string} selector - セレクタ
 * @returns {boolean} 要素が存在するかどうか
 */
export function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

/**
 * 複数の要素を取得
 * @param {string} selector - セレクタ
 * @returns {NodeList} 要素のリスト
 */
export function getElements(selector) {
    return document.querySelectorAll(selector);
}

/**
 * 単一の要素を取得
 * @param {string} selector - セレクタ
 * @returns {HTMLElement|null} 要素
 */
export function getElement(selector) {
    return document.querySelector(selector);
}
