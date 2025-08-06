/**
 * お気に入り機能のサービス単体テスト
 */

/**
 * CardServiceのお気に入り機能テスト
 */
function testCardServiceFavorite() {
    console.log('=== CardService お気に入り機能テスト ===');
    
    // テスト用のCardServiceインスタンスを作成
    const cardService = new CardService();
    
    // テスト用カードを追加
    const testCard = cardService.addCard({
        question: 'お気に入りテスト用カード',
        answer: 'テスト用の解答'
    });
    
    console.log('テストカード作成:', testCard);
    
    // 初期状態の確認
    const initialFavorite = testCard.favorite;
    console.log('初期お気に入り状態:', initialFavorite);
    
    // お気に入り状態を切り替え
    const toggledCard = cardService.toggleCardFavorite(testCard.id);
    console.log('切り替え後のカード:', toggledCard);
    
    // 状態が変更されたかを確認
    const favoriteChanged = toggledCard.favorite !== initialFavorite;
    console.log('お気に入り状態変更:', favoriteChanged ? '成功' : '失敗');
    
    // もう一度切り替えて元に戻るかを確認
    const toggledBackCard = cardService.toggleCardFavorite(testCard.id);
    const backToOriginal = toggledBackCard.favorite === initialFavorite;
    console.log('元の状態に戻る:', backToOriginal ? '成功' : '失敗');
    
    // データの永続化テスト
    const savedCards = cardService.getAllCards();
    const savedCard = savedCards.find(card => card.id === testCard.id);
    const persistenceTest = savedCard && savedCard.favorite === toggledBackCard.favorite;
    console.log('データ永続化:', persistenceTest ? '成功' : '失敗');
    
    // クリーンアップ
    cardService.deleteCard(testCard.id);
    
    return {
        favoriteChanged,
        backToOriginal,
        persistenceTest
    };
}

/**
 * 複数カードのお気に入り管理テスト
 */
function testMultipleFavorites() {
    console.log('=== 複数カードお気に入り管理テスト ===');
    
    const cardService = new CardService();
    
    // 複数のテストカードを作成
    const cards = [];
    for (let i = 1; i <= 3; i++) {
        const card = cardService.addCard({
            question: `テストカード${i}`,
            answer: `テスト解答${i}`
        });
        cards.push(card);
    }
    
    console.log('テストカード作成完了:', cards.length);
    
    // 一部をお気に入りに設定
    cardService.toggleCardFavorite(cards[0].id);
    cardService.toggleCardFavorite(cards[2].id);
    
    // お気に入りカードを取得
    const allCards = cardService.getAllCards();
    const favoriteCards = allCards.filter(card => card.favorite);
    const nonFavoriteCards = allCards.filter(card => !card.favorite);
    
    console.log('お気に入りカード数:', favoriteCards.length);
    console.log('非お気に入りカード数:', nonFavoriteCards.length);
    
    const correctFavoriteCount = favoriteCards.length === 2;
    const correctNonFavoriteCount = nonFavoriteCards.length >= 1; // 他のカードも含む可能性
    
    // クリーンアップ
    cards.forEach(card => cardService.deleteCard(card.id));
    
    return {
        correctFavoriteCount,
        correctNonFavoriteCount
    };
}

/**
 * お気に入りカードのフィルタリングテスト
 */
function testFavoriteFiltering() {
    console.log('=== お気に入りフィルタリングテスト ===');
    
    const cardService = new CardService();
    
    // テストカードを作成
    const normalCard = cardService.addCard({
        question: '通常カード',
        answer: '通常の解答'
    });
    
    const favoriteCard = cardService.addCard({
        question: 'お気に入りカード',
        answer: 'お気に入りの解答'
    });
    
    // お気に入りに設定
    cardService.toggleCardFavorite(favoriteCard.id);
    
    // フィルタリング機能のテスト（実装されている場合）
    const allCards = cardService.getAllCards();
    const favoriteCards = allCards.filter(card => card.favorite);
    const normalCards = allCards.filter(card => !card.favorite);
    
    console.log('全カード数:', allCards.length);
    console.log('お気に入りカード数:', favoriteCards.length);
    console.log('通常カード数:', normalCards.length);
    
    const hasFavoriteCard = favoriteCards.some(card => card.id === favoriteCard.id);
    const hasNormalCard = normalCards.some(card => card.id === normalCard.id);
    
    // クリーンアップ
    cardService.deleteCard(normalCard.id);
    cardService.deleteCard(favoriteCard.id);
    
    return {
        hasFavoriteCard,
        hasNormalCard
    };
}

/**
 * 全サービステストを実行
 */
function runFavoriteServiceTests() {
    console.log('=== お気に入り機能サービステスト開始 ===');
    
    const results = {
        basicToggle: testCardServiceFavorite(),
        multipleCards: testMultipleFavorites(),
        filtering: testFavoriteFiltering()
    };
    
    console.log('=== サービステスト結果まとめ ===');
    console.log('基本切り替えテスト:', results.basicToggle);
    console.log('複数カードテスト:', results.multipleCards);
    console.log('フィルタリングテスト:', results.filtering);
    
    const allPassed = 
        results.basicToggle.favoriteChanged && 
        results.basicToggle.backToOriginal && 
        results.basicToggle.persistenceTest &&
        results.multipleCards.correctFavoriteCount &&
        results.filtering.hasFavoriteCard &&
        results.filtering.hasNormalCard;
    
    console.log('総合結果:', allPassed ? '✓ 全テスト合格' : '✗ 一部テスト失敗');
    
    return results;
}

// テストの実行（ブラウザのコンソールで実行）
if (typeof window !== 'undefined') {
    window.runFavoriteServiceTests = runFavoriteServiceTests;
    console.log('お気に入り機能サービステストが読み込まれました。');
    console.log('runFavoriteServiceTests() を実行してテストを開始してください。');
}
