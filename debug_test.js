// デバッグ用のテストスクリプト
console.log('Debug test script loaded');

// DOM要素の存在確認
function checkElements() {
    const elements = [
        '#cardList',
        '#emptyState',
        '#relatedCardsModal',
        '.card-item',
        '.card-content'
    ];
    
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`${selector}: ${element ? 'Found' : 'Not found'}`);
    });
}

// イベントリスナーのテスト
function testEventListeners() {
    console.log('Testing event listeners...');
    
    // ダブルクリックイベントのテスト
    const cardContent = document.querySelector('.card-content');
    if (cardContent) {
        console.log('Card content found, testing double click...');
        
        // ダブルクリックイベントを発火
        const event = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        cardContent.dispatchEvent(event);
        console.log('Double click event dispatched');
    } else {
        console.log('No card content found');
    }
}

// アプリケーションの状態確認
function checkAppState() {
    if (window.flashcardApp) {
        console.log('FlashcardApp instance found');
        console.log('Current editing ID:', window.flashcardApp.editingId);
        console.log('Current filter:', window.flashcardApp.currentFilter);
        console.log('Cards count:', window.flashcardApp.cardService.getAllCards().length);
    } else {
        console.log('FlashcardApp instance not found');
    }
}

// テスト実行
setTimeout(() => {
    console.log('Running debug tests...');
    checkElements();
    checkAppState();
    testEventListeners();
}, 1000);
