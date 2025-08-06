/**
 * お気に入り機能の結合テスト
 * FlashcardApp、CardService、UIComponentsの連携をテスト
 */

/**
 * お気に入り機能の完全な結合テスト
 */
function testFavoriteIntegration() {
    console.log('=== お気に入り機能結合テスト開始 ===');
    
    // 初期状態の確認
    const initialCardCount = flashcardApp.cardService.getAllCards().length;
    console.log('初期カード数:', initialCardCount);
    
    // テスト用カードを追加
    const testCard = flashcardApp.cardService.addCard({
        question: '結合テスト用カード',
        answer: '結合テスト用の解答'
    });
    
    console.log('テストカード追加:', testCard);
    
    // 画面を再レンダリング
    flashcardApp.render();
    
    // DOM要素の確認
    setTimeout(() => {
        const cardElement = document.querySelector(`[data-id="${testCard.id}"]`);
        const favoriteBtn = cardElement ? cardElement.querySelector('.favorite-btn') : null;
        
        console.log('DOM要素確認:', {
            cardElement: !!cardElement,
            favoriteBtn: !!favoriteBtn
        });
        
        if (cardElement && favoriteBtn) {
            // 初期状態の確認
            const initialFavorite = cardElement.classList.contains('favorite');
            const initialBtnActive = favoriteBtn.classList.contains('active');
            
            console.log('初期DOM状態:', {
                cardHasFavorite: initialFavorite,
                btnIsActive: initialBtnActive
            });
            
            // お気に入りボタンをクリック
            console.log('お気に入りボタンをクリック...');
            favoriteBtn.click();
            
            // 少し待ってから状態を確認
            setTimeout(() => {
                const afterFavorite = cardElement.classList.contains('favorite');
                const afterBtnActive = favoriteBtn.classList.contains('active');
                const cardData = flashcardApp.cardService.getCardById(testCard.id);
                
                console.log('クリック後の状態:', {
                    cardHasFavorite: afterFavorite,
                    btnIsActive: afterBtnActive,
                    dataFavorite: cardData.favorite
                });
                
                // CSSスタイルの確認
                const computedStyle = window.getComputedStyle(cardElement);
                const borderLeftWidth = computedStyle.borderLeftWidth;
                const borderLeftColor = computedStyle.borderLeftColor;
                
                console.log('CSSスタイル:', {
                    borderLeftWidth,
                    borderLeftColor
                });
                
                // テスト結果の評価
                const domUpdated = afterFavorite !== initialFavorite;
                const buttonUpdated = afterBtnActive !== initialBtnActive;
                const dataUpdated = cardData.favorite !== false; // 初期値はfalse
                const styleApplied = borderLeftWidth === '4px';
                
                const testResult = {
                    domUpdated,
                    buttonUpdated,
                    dataUpdated,
                    styleApplied,
                    allPassed: domUpdated && buttonUpdated && dataUpdated && styleApplied
                };
                
                console.log('結合テスト結果:', testResult);
                
                // クリーンアップ
                flashcardApp.cardService.deleteCard(testCard.id);
                flashcardApp.render();
                
                return testResult;
            }, 500);
        }
    }, 1000);
}

/**
 * 検索機能とお気に入り機能の結合テスト
 */
function testFavoriteWithSearch() {
    console.log('=== お気に入り×検索機能結合テスト ===');
    
    // テスト用カードを複数作成
    const cards = [];
    for (let i = 1; i <= 3; i++) {
        const card = flashcardApp.cardService.addCard({
            question: `検索テスト${i}`,
            answer: `検索用解答${i}`
        });
        cards.push(card);
    }
    
    // 一部をお気に入りに設定
    flashcardApp.toggleFavorite(cards[1].id);
    
    // 検索を実行
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '検索テスト';
        searchInput.dispatchEvent(new Event('input'));
        
        setTimeout(() => {
            // 検索結果でお気に入りカードが正しく表示されるかを確認
            const searchResults = document.querySelectorAll('.card-item');
            const favoriteInResults = Array.from(searchResults).some(card => 
                card.classList.contains('favorite')
            );
            
            console.log('検索結果でのお気に入り表示:', favoriteInResults);
            
            // クリーンアップ
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            cards.forEach(card => flashcardApp.cardService.deleteCard(card.id));
            flashcardApp.render();
            
            return { favoriteInResults };
        }, 500);
    }
}

/**
 * フィルター機能とお気に入り機能の結合テスト
 */
function testFavoriteWithFilter() {
    console.log('=== お気に入り×フィルター機能結合テスト ===');
    
    // テスト用カードを作成
    const normalCard = flashcardApp.cardService.addCard({
        question: 'フィルターテスト通常',
        answer: '通常カード'
    });
    
    const favoriteCard = flashcardApp.cardService.addCard({
        question: 'フィルターテストお気に入り',
        answer: 'お気に入りカード'
    });
    
    // お気に入りに設定
    flashcardApp.toggleFavorite(favoriteCard.id);
    
    // 画面を更新
    flashcardApp.render();
    
    setTimeout(() => {
        // フィルター機能のテスト（実装されている場合）
        const allCards = document.querySelectorAll('.card-item');
        const favoriteCards = document.querySelectorAll('.card-item.favorite');
        const normalCards = document.querySelectorAll('.card-item:not(.favorite)');
        
        console.log('フィルター結果:', {
            allCards: allCards.length,
            favoriteCards: favoriteCards.length,
            normalCards: normalCards.length
        });
        
        // クリーンアップ
        flashcardApp.cardService.deleteCard(normalCard.id);
        flashcardApp.cardService.deleteCard(favoriteCard.id);
        flashcardApp.render();
        
        return {
            hasFavoriteCards: favoriteCards.length > 0,
            hasNormalCards: normalCards.length > 0
        };
    }, 1000);
}

/**
 * 編集機能とお気に入り機能の結合テスト
 */
function testFavoriteWithEdit() {
    console.log('=== お気に入り×編集機能結合テスト ===');
    
    // テスト用カードを作成
    const testCard = flashcardApp.cardService.addCard({
        question: '編集テスト用カード',
        answer: '編集テスト用解答'
    });
    
    // お気に入りに設定
    flashcardApp.toggleFavorite(testCard.id);
    flashcardApp.render();
    
    setTimeout(() => {
        const cardElement = document.querySelector(`[data-id="${testCard.id}"]`);
        
        if (cardElement) {
            // 編集モードに入る
            flashcardApp.editCard(testCard.id);
            
            setTimeout(() => {
                // 編集モードでもお気に入りボタンが表示されるかを確認
                const editingCard = document.querySelector(`[data-id="${testCard.id}"]`);
                const favoriteBtn = editingCard ? editingCard.querySelector('.favorite-btn') : null;
                const isActive = favoriteBtn ? favoriteBtn.classList.contains('active') : false;
                
                console.log('編集モードでのお気に入り状態:', {
                    hasFavoriteBtn: !!favoriteBtn,
                    isActive: isActive
                });
                
                // 編集をキャンセル
                flashcardApp.cancelEdit();
                
                // クリーンアップ
                flashcardApp.cardService.deleteCard(testCard.id);
                flashcardApp.render();
                
                return {
                    hasFavoriteBtn: !!favoriteBtn,
                    isActive: isActive
                };
            }, 500);
        }
    }, 1000);
}

/**
 * 全結合テストを実行
 */
function runFavoriteIntegrationTests() {
    console.log('=== お気に入り機能結合テスト実行 ===');
    
    // 各テストを順番に実行
    setTimeout(() => testFavoriteIntegration(), 100);
    setTimeout(() => testFavoriteWithSearch(), 2000);
    setTimeout(() => testFavoriteWithFilter(), 4000);
    setTimeout(() => testFavoriteWithEdit(), 6000);
    
    setTimeout(() => {
        console.log('=== 全結合テスト完了 ===');
    }, 8000);
}

// テストの実行（ブラウザのコンソールで実行）
if (typeof window !== 'undefined') {
    window.runFavoriteIntegrationTests = runFavoriteIntegrationTests;
    console.log('お気に入り機能結合テストが読み込まれました。');
    console.log('runFavoriteIntegrationTests() を実行してテストを開始してください。');
}
