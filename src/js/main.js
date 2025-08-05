import { FlashcardApp } from './FlashcardApp.js';
import { setFlashcardApp } from './globalFunctions.js';

/**
 * アプリケーションのメインエントリーポイント
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // アプリケーションを初期化
        const app = new FlashcardApp();
        
        // グローバル関数でアクセスできるように設定
        setFlashcardApp(app);
        
        console.log('暗記カードアプリが正常に初期化されました');
    } catch (error) {
        console.error('アプリケーションの初期化中にエラーが発生しました:', error);
        
        // エラー通知を表示
        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification error show';
        errorNotification.textContent = 'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。';
        document.body.appendChild(errorNotification);
        
        // 5秒後に通知を削除
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.remove();
            }
        }, 5000);
    }
});
