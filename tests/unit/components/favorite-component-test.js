/**
 * お気に入り機能のコンポーネント単体テスト
 */

// テスト用のモックデータ
const mockCard = {
    id: 1,
    displayId: 1,
    question: 'テスト問題',
    answer: 'テスト解答',
    favorite: false,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

const mockFavoriteCard = {
    ...mockCard,
    id: 2,
    displayId: 2,
    favorite: true
};

/**
 * お気に入りボタンのレンダリングテスト
 */
function testFavoriteButtonRendering() {
    console.log('=== お気に入りボタンレンダリングテスト ===');
    
    // 通常カードのテスト
    const normalCardHtml = UIComponents.renderCard(mockCard, {
        flashcardMode: true,
        isExpanded: false
    });
    
    const hasNormalFavoriteBtn = normalCardHtml.includes('class="favorite-btn "');
    const hasNormalActiveClass = normalCardHtml.includes('class="favorite-btn active"');
    
    console.log('通常カード:', {
        hasButton: hasNormalFavoriteBtn,
        hasActiveClass: hasNormalActiveClass,
        expected: { hasButton: true, hasActiveClass: false }
    });
    
    // お気に入りカードのテスト
    const favoriteCardHtml = UIComponents.renderCard(mockFavoriteCard, {
        flashcardMode: true,
        isExpanded: false
    });
    
    const hasFavoriteFavoriteBtn = favoriteCardHtml.includes('class="favorite-btn active"');
    const hasFavoriteClass = favoriteCardHtml.includes('class="card-item completed favorite"') || 
                            favoriteCardHtml.includes('class="card-item favorite"');
    
    console.log('お気に入りカード:', {
        hasActiveButton: hasFavoriteFavoriteBtn,
        hasFavoriteClass: hasFavoriteClass,
        expected: { hasActiveButton: true, hasFavoriteClass: true }
    });
    
    return {
        normalCard: hasNormalFavoriteBtn && !hasNormalActiveClass,
        favoriteCard: hasFavoriteFavoriteBtn && hasFavoriteClass
    };
}

/**
 * お気に入り状態切り替えテスト
 */
function testFavoriteToggle() {
    console.log('=== お気に入り状態切り替えテスト ===');
    
    const testCard = { ...mockCard };
    const initialFavorite = testCard.favorite;
    
    // Card.toggleFavorite()のテスト
    const cardInstance = new Card(testCard);
    console.log('初期状態:', cardInstance.favorite);
    
    cardInstance.toggleFavorite();
    console.log('切り替え後:', cardInstance.favorite);
    
    const toggleWorked = cardInstance.favorite !== initialFavorite;
    console.log('切り替えテスト結果:', toggleWorked ? '成功' : '失敗');
    
    return toggleWorked;
}

/**
 * CSSクラス適用テスト
 */
function testFavoriteCSSClasses() {
    console.log('=== お気に入りCSSクラステスト ===');
    
    // テスト用のDOM要素を作成
    const testContainer = document.createElement('div');
    testContainer.innerHTML = `
        <li class="card-item" data-id="test">
            <div class="card-content">テストカード</div>
            <button class="favorite-btn">★</button>
        </li>
    `;
    
    document.body.appendChild(testContainer);
    
    const cardElement = testContainer.querySelector('.card-item');
    const favoriteBtn = testContainer.querySelector('.favorite-btn');
    
    // 初期状態の確認
    const initialHasFavorite = cardElement.classList.contains('favorite');
    const initialBtnActive = favoriteBtn.classList.contains('active');
    
    console.log('初期状態:', {
        cardHasFavorite: initialHasFavorite,
        btnIsActive: initialBtnActive
    });
    
    // お気に入りクラスを追加
    cardElement.classList.add('favorite');
    favoriteBtn.classList.add('active');
    
    // 変更後の状態を確認
    const afterHasFavorite = cardElement.classList.contains('favorite');
    const afterBtnActive = favoriteBtn.classList.contains('active');
    
    console.log('変更後:', {
        cardHasFavorite: afterHasFavorite,
        btnIsActive: afterBtnActive
    });
    
    // CSSスタイルの確認
    const computedStyle = window.getComputedStyle(cardElement);
    const borderLeft = computedStyle.borderLeft;
    const borderLeftWidth = computedStyle.borderLeftWidth;
    
    console.log('計算されたスタイル:', {
        borderLeft,
        borderLeftWidth
    });
    
    // クリーンアップ
    document.body.removeChild(testContainer);
    
    return {
        classToggle: afterHasFavorite && afterBtnActive,
        borderApplied: borderLeftWidth === '4px'
    };
}

/**
 * 全テストを実行
 */
function runFavoriteComponentTests() {
    console.log('=== お気に入り機能コンポーネントテスト開始 ===');
    
    const results = {
        rendering: testFavoriteButtonRendering(),
        toggle: testFavoriteToggle(),
        css: testFavoriteCSSClasses()
    };
    
    console.log('=== テスト結果まとめ ===');
    console.log('レンダリングテスト:', results.rendering);
    console.log('切り替えテスト:', results.toggle);
    console.log('CSSテスト:', results.css);
    
    const allPassed = 
        results.rendering.normalCard && 
        results.rendering.favoriteCard && 
        results.toggle && 
        results.css.classToggle && 
        results.css.borderApplied;
    
    console.log('総合結果:', allPassed ? '✓ 全テスト合格' : '✗ 一部テスト失敗');
    
    return results;
}

// テストの実行（ブラウザのコンソールで実行）
if (typeof window !== 'undefined') {
    window.runFavoriteComponentTests = runFavoriteComponentTests;
    console.log('お気に入り機能コンポーネントテストが読み込まれました。');
    console.log('runFavoriteComponentTests() を実行してテストを開始してください。');
}
