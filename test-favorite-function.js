// お気に入り機能のテスト用スクリプト
// ブラウザのコンソールで実行してください

console.log('=== お気に入り機能テスト開始 ===');

// 1. 現在のカード数を確認
console.log('現在のカード数:', flashcardApp.cardService.getAllCards().length);

// 2. テスト用カードを追加
const testCard = flashcardApp.cardService.addCard({
    question: 'お気に入りテスト用カード',
    answer: 'このカードでお気に入り機能をテストします'
});

console.log('テストカードを追加:', testCard);

// 3. カードが表示されるまで少し待つ
setTimeout(() => {
    console.log('=== お気に入り機能テスト実行 ===');
    
    // 4. カードの要素を取得
    const cardElement = document.querySelector(`[data-id="${testCard.id}"]`);
    console.log('カード要素:', cardElement);
    
    if (cardElement) {
        console.log('カードの初期クラス:', cardElement.className);
        
        // 5. お気に入りボタンを取得
        const favoriteBtn = cardElement.querySelector('.favorite-btn');
        console.log('お気に入りボタン:', favoriteBtn);
        
        if (favoriteBtn) {
            console.log('ボタンの初期クラス:', favoriteBtn.className);
            
            // 6. お気に入りボタンをクリック
            console.log('お気に入りボタンをクリックします...');
            favoriteBtn.click();
            
            // 7. 少し待ってから結果を確認
            setTimeout(() => {
                console.log('=== クリック後の状態確認 ===');
                console.log('カードの現在のクラス:', cardElement.className);
                console.log('ボタンの現在のクラス:', favoriteBtn.className);
                console.log('カードデータ:', flashcardApp.cardService.getCardById(testCard.id));
                
                // 8. 左側の境界線をチェック
                const computedStyle = window.getComputedStyle(cardElement);
                console.log('border-left:', computedStyle.borderLeft);
                console.log('border-left-color:', computedStyle.borderLeftColor);
                console.log('border-left-width:', computedStyle.borderLeftWidth);
                console.log('border-left-style:', computedStyle.borderLeftStyle);
                
                console.log('=== お気に入り機能テスト完了 ===');
            }, 500);
        }
    }
}, 1000);
