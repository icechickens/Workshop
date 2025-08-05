import { UIComponents } from './components/UIComponents.js';
import { getElement, showNotification } from './utils.js';

// グローバル変数
let flashcardApp;
let currentEditingCardId = null;
let selectedRelatedCards = [];

/**
 * アプリケーションインスタンスを設定
 * @param {FlashcardApp} app - アプリケーションインスタンス
 */
export function setFlashcardApp(app) {
    flashcardApp = app;
    window.flashcardApp = app; // グローバルアクセス用
}

// HTMLから呼び出されるグローバル関数
window.addCard = function() {
    flashcardApp?.addCard();
};

window.filterCards = function(filter) {
    flashcardApp?.filterCards(filter);
};

window.filterFavorites = function() {
    flashcardApp?.filterFavorites();
};

window.clearCompleted = function() {
    flashcardApp?.clearCompleted();
};

window.expandAllCards = function() {
    flashcardApp?.expandAllCards();
};

window.collapseAllCards = function() {
    flashcardApp?.collapseAllCards();
};

window.performSearch = function() {
    flashcardApp?.performSearch();
};

window.clearSearch = function() {
    flashcardApp?.clearSearch();
};

window.updateIntervalInputs = function() {
    flashcardApp?.generateSettingsIntervalInputs();
};

window.toggleDarkMode = function() {
    flashcardApp?.toggleDarkMode();
};

window.changeSortOrder = function(field) {
    flashcardApp?.changeSortOrder(field);
};

// 設定関連の関数
window.saveSettings = function() {
    if (!flashcardApp) return;

    const forgettingSettings = flashcardApp.settingsService.getForgettingSettings();
    const darkModeSettings = flashcardApp.settingsService.getDarkModeSettings();

    // 忘却曲線は常に有効
    const notifications = getElement('#settingsEnableNotifications')?.checked ?? true;
    const darkMode = getElement('#settingsEnableDarkMode')?.checked ?? false;
    const reviewCount = parseInt(getElement('#settingsReviewCount')?.value) || 5;

    // 間隔設定を保存
    const intervals = [];
    for (let i = 0; i < reviewCount; i++) {
        const input = getElement(`#settingsInterval${i + 1}`);
        if (input) {
            intervals.push(parseInt(input.value) || 1);
        }
    }

    flashcardApp.settingsService.updateForgettingSettings({
        enabled: true,
        notifications,
        reviewCount,
        intervals
    });

    flashcardApp.settingsService.updateDarkModeSettings({
        enabled: darkMode
    });

    flashcardApp.applyTheme();
    flashcardApp.updateForgettingStatus();
    flashcardApp.render();
    
    showNotification('設定を保存しました', 'success');
};

window.resetSettings = function() {
    if (!flashcardApp) return;

    if (confirm('設定をデフォルトに戻しますか？')) {
        flashcardApp.settingsService.resetToDefaults();
        flashcardApp.expandedCards.clear();
        flashcardApp.initSettingsScreen();
        flashcardApp.applyTheme();
        flashcardApp.render();
        
        showNotification('設定をリセットしました', 'info');
    }
};

// タグフィルターモーダル関連の関数
window.openTagsFilter = function() {
    const modal = getElement('#tagsFilterModal');
    if (modal) {
        modal.classList.add('show');
        renderTagsFilter();
    }
};

window.closeTagsFilter = function() {
    const modal = getElement('#tagsFilterModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

function renderTagsFilter() {
    const container = getElement('#tagsFilterContainer');
    if (!container || !flashcardApp) return;

    const allTags = flashcardApp.cardService.getAllTags();
    const selectedTags = flashcardApp.selectedTags;

    if (!allTags || allTags.length === 0) {
        container.innerHTML = '<div class="no-tags-message">タグがありません。カードにタグを追加してください。</div>';
        return;
    }

    // タグごとのカード数をカウント
    const tagCounts = {};
    flashcardApp.cardService.getAllCards().forEach(card => {
        if (card.tags && Array.isArray(card.tags)) {
            card.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    container.innerHTML = UIComponents.renderTagsFilter(allTags, selectedTags, tagCounts);
}

window.toggleTagSelection = function(tag) {
    if (!flashcardApp) return;

    const index = flashcardApp.selectedTags.indexOf(tag);
    if (index === -1) {
        flashcardApp.selectedTags.push(tag);
    } else {
        flashcardApp.selectedTags.splice(index, 1);
    }
    renderTagsFilter();
};

window.removeTagSelection = function(tag) {
    if (!flashcardApp) return;

    const index = flashcardApp.selectedTags.indexOf(tag);
    if (index !== -1) {
        flashcardApp.selectedTags.splice(index, 1);
    }
    renderTagsFilter();
};

window.applyTagsFilter = function() {
    if (!flashcardApp) return;

    flashcardApp.render();
    closeTagsFilter();

    if (flashcardApp.selectedTags.length > 0) {
        showNotification(`タグ「${flashcardApp.selectedTags.join('、')}」でフィルター中`, 'info');
    }
};

window.clearTagsFilter = function() {
    if (!flashcardApp) return;

    flashcardApp.selectedTags = [];
    renderTagsFilter();
    flashcardApp.render();
    
    showNotification('タグフィルターをクリアしました', 'info');
};

// 関連カード選択モーダル関連の関数
window.openRelatedCardsModal = function(cardId) {
    console.log('openRelatedCardsModal called with cardId:', cardId);
    
    currentEditingCardId = cardId;
    const card = flashcardApp?.cardService.getCardById(cardId);

    if (card && card.relatedCards) {
        selectedRelatedCards = [...card.relatedCards];
        console.log('Existing related cards:', selectedRelatedCards);
    } else {
        selectedRelatedCards = [];
        console.log('No existing related cards');
    }

    const modal = getElement('#relatedCardsModal');
    if (modal) {
        modal.classList.add('show');
        console.log('Modal shown');
    } else {
        console.error('Related cards modal not found');
    }

    // 関連カード検索フィールドをクリア
    const searchInput = getElement('#relatedCardsSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', () => {
            renderRelatedCardsList(searchInput.value.trim());
        });
    }

    renderRelatedCardsList();
    renderSelectedRelatedCards();
};

// 新規カード作成時の関連カードモーダルを開く関数
window.openRelatedCardsModalForNew = function() {
    console.log('openRelatedCardsModalForNew called');
    
    currentEditingCardId = null; // 新規カード作成時はnull
    selectedRelatedCards = flashcardApp?.getNewCardRelatedCards() || [];
    console.log('New card related cards:', selectedRelatedCards);

    const modal = getElement('#relatedCardsModal');
    if (modal) {
        modal.classList.add('show');
        console.log('Modal shown for new card');
    } else {
        console.error('Related cards modal not found');
    }

    // 関連カード検索フィールドをクリア
    const searchInput = getElement('#relatedCardsSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', () => {
            renderRelatedCardsList(searchInput.value.trim());
        });
    }

    renderRelatedCardsList();
    renderSelectedRelatedCards();
};

window.closeRelatedCardsModal = function() {
    const modal = getElement('#relatedCardsModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // 状態をクリア
    currentEditingCardId = null;
    selectedRelatedCards = [];
    
    // 検索フィールドもクリア
    const searchInput = getElement('#relatedCardsSearch');
    if (searchInput) {
        searchInput.value = '';
    }
};

function renderRelatedCardsList(searchQuery = '') {
    console.log('renderRelatedCardsList called with searchQuery:', searchQuery);
    
    const container = getElement('#relatedCardsContainer');
    if (!container) {
        console.error('Related cards container not found');
        return;
    }
    
    if (!flashcardApp) {
        console.error('FlashcardApp not available');
        return;
    }

    // 現在編集中のカードを除外した他のカードを取得
    let availableCards = flashcardApp.cardService.getAllCards()
        .filter(card => card.id !== currentEditingCardId);
    
    console.log('Available cards count:', availableCards.length);

    // 検索クエリがある場合はフィルタリング
    if (searchQuery) {
        availableCards = availableCards.filter(card => card.matchesSearch(searchQuery));
        console.log('Filtered cards count:', availableCards.length);
    }

    container.innerHTML = UIComponents.renderRelatedCardsList(availableCards, selectedRelatedCards);
    console.log('Related cards list rendered');
}

function renderSelectedRelatedCards() {
    console.log('renderSelectedRelatedCards called');
    
    const container = getElement('#selectedCardsList');
    if (!container) {
        console.error('Selected cards list container not found');
        return;
    }
    
    if (!flashcardApp) {
        console.error('FlashcardApp not available');
        return;
    }

    const selectedCards = selectedRelatedCards.map(cardId => 
        flashcardApp.cardService.getCardById(cardId)
    ).filter(card => card !== null);
    
    console.log('Selected cards count:', selectedCards.length);

    container.innerHTML = UIComponents.renderSelectedRelatedCards(selectedCards);
    console.log('Selected related cards rendered');
}

window.toggleRelatedCard = function(cardId) {
    const index = selectedRelatedCards.indexOf(cardId);
    if (index === -1) {
        selectedRelatedCards.push(cardId);
    } else {
        selectedRelatedCards.splice(index, 1);
    }

    const searchQuery = getElement('#relatedCardsSearch')?.value.trim() || '';
    renderRelatedCardsList(searchQuery);
    renderSelectedRelatedCards();
};

window.clearRelatedCards = function() {
    selectedRelatedCards = [];
    const searchQuery = getElement('#relatedCardsSearch')?.value.trim() || '';
    renderRelatedCardsList(searchQuery);
    renderSelectedRelatedCards();
};

window.applyRelatedCards = function() {
    console.log('applyRelatedCards called');
    console.log('currentEditingCardId:', currentEditingCardId);
    console.log('selectedRelatedCards:', selectedRelatedCards);
    
    if (!flashcardApp) {
        console.error('flashcardApp not available');
        return;
    }
    
    if (currentEditingCardId === null) {
        // 新規カード作成時
        console.log('Setting related cards for new card');
        flashcardApp.setNewCardRelatedCards(selectedRelatedCards);
        showNotification('関連カードを設定しました', 'success');
    } else {
        // 既存カード編集時
        console.log('Setting related cards for existing card');
        flashcardApp.setRelatedCards(currentEditingCardId, selectedRelatedCards);
    }
    
    closeRelatedCardsModal();
};

// モーダル外クリックで閉じる処理
window.addEventListener('click', (e) => {
    const tagsFilterModal = getElement('#tagsFilterModal');
    if (e.target === tagsFilterModal) {
        closeTagsFilter();
    }

    const relatedCardsModal = getElement('#relatedCardsModal');
    if (e.target === relatedCardsModal) {
        closeRelatedCardsModal();
    }

    const imageModal = getElement('#imageModal');
    if (e.target === imageModal) {
        closeImageModal();
    }
});

// URL管理関数
window.addUrlToCard = function(cardId, url) {
    if (!flashcardApp || !url || url.trim() === '') {
        showNotification('有効なURLを入力してください', 'error');
        return;
    }

    try {
        flashcardApp.cardService.addUrlToCard(cardId, url.trim());
        
        // URLリストを更新
        const urlsList = getElement(`#urls-list-${cardId}`);
        if (urlsList) {
            const card = flashcardApp.cardService.getCardById(cardId);
            urlsList.innerHTML = UIComponents.renderEditableUrls(card);
        }
        
        // 入力フィールドをクリア
        const urlInput = getElement('.url-input');
        if (urlInput) {
            urlInput.value = '';
        }
        
        showNotification('URLを追加しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.removeUrlFromCard = function(cardId, url) {
    if (!flashcardApp) return;

    try {
        flashcardApp.cardService.removeUrlFromCard(cardId, url);
        
        // URLリストを更新
        const urlsList = getElement(`#urls-list-${cardId}`);
        if (urlsList) {
            const card = flashcardApp.cardService.getCardById(cardId);
            urlsList.innerHTML = UIComponents.renderEditableUrls(card);
        }
        
        showNotification('URLを削除しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// 画像管理関数
window.addImageToCard = async function(cardId, file) {
    if (!flashcardApp || !file) {
        showNotification('画像ファイルを選択してください', 'error');
        return;
    }

    try {
        await flashcardApp.cardService.addImageToCard(cardId, file);
        
        // 画像リストを更新
        const imagesList = getElement(`#images-list-${cardId}`);
        if (imagesList) {
            const card = flashcardApp.cardService.getCardById(cardId);
            imagesList.innerHTML = UIComponents.renderEditableImages(card);
        }
        
        // ファイル入力をクリア
        const imageInput = getElement('.image-input');
        if (imageInput) {
            imageInput.value = '';
        }
        
        showNotification('画像を追加しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.removeImageFromCard = function(cardId, imageId) {
    if (!flashcardApp) return;

    try {
        flashcardApp.cardService.removeImageFromCard(cardId, imageId);
        
        // 画像リストを更新
        const imagesList = getElement(`#images-list-${cardId}`);
        if (imagesList) {
            const card = flashcardApp.cardService.getCardById(cardId);
            imagesList.innerHTML = UIComponents.renderEditableImages(card);
        }
        
        showNotification('画像を削除しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// 画像モーダル関数
window.openImageModal = function(imageSrc, imageName) {
    const modal = getElement('#imageModal');
    const modalImage = getElement('#modalImage');
    const modalImageName = getElement('#modalImageName');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        if (modalImageName) {
            modalImageName.textContent = imageName || '画像';
        }
        modal.classList.add('show');
    }
};

window.closeImageModal = function() {
    const modal = getElement('#imageModal');
    if (modal) {
        modal.classList.remove('show');
    }
};

// 新規カード作成時のURL・画像管理関数
window.addUrlToNewCard = function() {
    const urlInput = getElement('#newCardUrlInput');
    if (!flashcardApp || !urlInput) return;

    const url = urlInput.value.trim();
    if (!url) {
        showNotification('URLを入力してください', 'error');
        return;
    }

    try {
        flashcardApp.addUrlToNewCard(url);
        urlInput.value = '';
        showNotification('URLを追加しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.removeUrlFromNewCard = function(url) {
    if (!flashcardApp) return;

    try {
        flashcardApp.removeUrlFromNewCard(url);
        showNotification('URLを削除しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.addImageToNewCard = async function(file) {
    if (!flashcardApp || !file) {
        showNotification('画像ファイルを選択してください', 'error');
        return;
    }

    try {
        await flashcardApp.addImageToNewCard(file);
        
        // ファイル入力をクリア
        const imageInput = getElement('#newCardImageInput');
        if (imageInput) {
            imageInput.value = '';
        }
        
        showNotification('画像を追加しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.removeImageFromNewCard = function(imageId) {
    if (!flashcardApp) return;

    try {
        flashcardApp.removeImageFromNewCard(imageId);
        showNotification('画像を削除しました', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};
