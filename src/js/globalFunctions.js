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
    currentEditingCardId = cardId;
    const card = flashcardApp?.cardService.getCardById(cardId);

    if (card && card.relatedCards) {
        selectedRelatedCards = [...card.relatedCards];
    } else {
        selectedRelatedCards = [];
    }

    const modal = getElement('#relatedCardsModal');
    if (modal) {
        modal.classList.add('show');
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
    currentEditingCardId = null;
    selectedRelatedCards = [];
};

function renderRelatedCardsList(searchQuery = '') {
    const container = getElement('#relatedCardsContainer');
    if (!container || !flashcardApp) return;

    // 現在編集中のカードを除外した他のカードを取得
    let availableCards = flashcardApp.cardService.getAllCards()
        .filter(card => card.id !== currentEditingCardId);

    // 検索クエリがある場合はフィルタリング
    if (searchQuery) {
        availableCards = availableCards.filter(card => card.matchesSearch(searchQuery));
    }

    container.innerHTML = UIComponents.renderRelatedCardsList(availableCards, selectedRelatedCards);
}

function renderSelectedRelatedCards() {
    const container = getElement('#selectedCardsList');
    if (!container || !flashcardApp) return;

    const selectedCards = selectedRelatedCards.map(cardId => 
        flashcardApp.cardService.getCardById(cardId)
    ).filter(card => card !== null);

    container.innerHTML = UIComponents.renderSelectedRelatedCards(selectedCards);
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
    if (currentEditingCardId === null || !flashcardApp) return;

    flashcardApp.setRelatedCards(currentEditingCardId, selectedRelatedCards);
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
});
