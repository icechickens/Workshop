import { CardService } from './services/CardService.js';
import { SettingsService } from './services/SettingsService.js';
import { UIComponents } from './components/UIComponents.js';
import { CONFIG } from './config.js';
import { showNotification, debounce, getElement, getElements } from './utils.js';

/**
 * メインアプリケーションクラス
 */
export class FlashcardApp {
    constructor() {
        this.cardService = new CardService();
        this.settingsService = new SettingsService();
        
        // UI状態
        this.currentFilter = 'active';
        this.editingId = null;
        this.searchQuery = '';
        this.homeSearchQuery = ''; // ホーム画面用検索クエリ
        this.selectedTags = [];
        this.expandedCards = new Set();
        this.currentScreen = 'home'; // デフォルトをホーム画面に変更
        
        // 関連カード選択用
        this.currentEditingCardId = null;
        this.selectedRelatedCards = [];
        
        // 新規カード作成時の関連カード
        this.newCardRelatedCards = [];
        
        // 新規カード作成時のURL・画像
        this.newCardUrls = [];
        this.newCardImages = [];
        this.newCardImageData = {};
        
        this.init();
    }

    /**
     * アプリケーションを初期化
     */
    init() {
        this.bindEvents();
        this.applyTheme();
        this.updateNewCardRelatedCardsCount(); // 新規カード作成時の関連カード数を初期化
        this.updateNewCardUrlsList(); // 新規カード作成時のURLリストを初期化
        this.updateNewCardImagesList(); // 新規カード作成時の画像リストを初期化
        this.checkForgettingCurve();
        
        // テスト用：サンプルカードがない場合は追加（開発時のみ）
        if (this.cardService.getAllCards().length === 0) {
            console.log('No cards found, adding sample cards for testing');
            this.addSampleCards();
        }
        
        // デフォルトで全てのカードを展開状態にする
        this.cardService.getAllCards().forEach(card => {
            if (card.answer && card.answer.trim() !== '') {
                this.expandedCards.add(card.id);
            }
        });
        
        // 初期フィルター状態を設定（「学習中」をデフォルトに）
        getElements('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = getElement('.filter-btn[onclick*="active"]');
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // URLハッシュに基づいて画面を切り替え
        this.handleHashChange();
        
        // ハッシュ変更イベントを監視
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
        
        this.render();
        this.updateStats();
        this.updateForgettingStatus();
        this.updateSortButtons();
        
        // 定期的に忘却曲線をチェック（1分ごと）
        setInterval(() => {
            this.checkForgettingCurve();
        }, 60000);
    }

    /**
     * テスト用のサンプルカードを追加
     */
    addSampleCards() {
        const sampleCards = [
            {
                question: 'JavaScriptの変数宣言',
                answer: 'let, const, varの3つの方法があります。letは再代入可能、constは再代入不可、varは古い書き方です。',
                tags: ['JavaScript', 'プログラミング']
            },
            {
                question: 'HTMLの基本構造',
                answer: '<!DOCTYPE html>, <html>, <head>, <body>タグで構成されます。',
                tags: ['HTML', 'Web開発']
            },
            {
                question: 'CSSのボックスモデル',
                answer: 'content, padding, border, marginの4つの領域から構成されます。',
                tags: ['CSS', 'Web開発']
            }
        ];

        sampleCards.forEach(cardData => {
            this.cardService.addCard(cardData);
        });
        
        console.log('Sample cards added:', sampleCards.length);
    }

    /**
     * イベントリスナーをバインド
     */
    bindEvents() {
        // Enterキーでカード追加
        const questionInput = getElement('#cardQuestion');
        if (questionInput) {
            questionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCard();
                }
            });
        }

        // Ctrl+Enterで答えフィールドからもカード追加
        const answerInput = getElement('#cardAnswer');
        if (answerInput) {
            answerInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.addCard();
                }
            });
        }

        // ナビゲーションメニューのイベント
        getElements('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = item.dataset.screen;
                window.location.hash = screen;
            });
        });

        // カードのクリック・ダブルクリック処理
        this.bindCardEvents();

        // 検索機能のイベントリスナー
        this.bindSearchEvents();

        // 入力フィールドの文字数制限表示
        this.bindInputValidation();

        // キーボードショートカット
        this.bindKeyboardShortcuts();
    }

    /**
     * カードのイベントをバインド
     */
    bindCardEvents() {
        console.log('Binding card events');
        
        let clickCount = 0;
        let clickTimer = null;
        let lastClickedElement = null;

        // 統一されたクリックイベント処理
        document.addEventListener('click', (e) => {
            // カードコンテンツ内でのクリックかチェック
            const cardContent = e.target.closest('.card-content');
            if (!cardContent) {
                return;
            }
            
            // アクションボタンや編集フォーム内でのクリックは無視
            if (e.target.closest('.card-actions') || e.target.closest('.edit-form')) {
                return;
            }
            
            const cardItem = cardContent.closest('.card-item');
            if (!cardItem) {
                return;
            }
            
            // 編集モードの場合はクリックイベントを無視
            if (cardItem.querySelector('.edit-form')) {
                return;
            }

            const cardId = parseInt(cardItem.dataset.id);
            
            // 同じ要素への連続クリックかチェック
            if (lastClickedElement === cardItem) {
                clickCount++;
            } else {
                clickCount = 1;
                lastClickedElement = cardItem;
            }

            // 既存のタイマーをクリア
            clearTimeout(clickTimer);

            if (clickCount === 1) {
                // シングルクリック処理（遅延実行）
                clickTimer = setTimeout(() => {
                    if (clickCount === 1) {
                        console.log('Single click on card:', cardId);
                        // フラッシュカードモードでのみ詳細表示
                        const flashcardSettings = this.settingsService.getFlashcardSettings();
                        if (flashcardSettings.enabled) {
                            this.toggleFlashcard(cardId);
                        }
                    }
                    clickCount = 0;
                    lastClickedElement = null;
                }, 300);
            } else if (clickCount === 2) {
                // ダブルクリック処理（即座に実行）
                console.log('Double click on card:', cardId);
                
                // 習得済みカードは編集不可
                const card = this.cardService.getCardById(cardId);
                if (!card) {
                    console.log('Card not found:', cardId);
                    return;
                }
                
                if (card.completed) {
                    console.log('Card is completed, cannot edit:', cardId);
                    showNotification('習得済みのカードは編集できません', 'warning');
                } else {
                    console.log('Calling editCard for:', cardId);
                    this.editCard(cardId);
                }
                
                clickCount = 0;
                lastClickedElement = null;
            }
        });
    }

    /**
     * 検索イベントをバインド
     */
    bindSearchEvents() {
        const searchInput = getElement('#searchInput');
        if (searchInput) {
            const debouncedSearch = debounce((query) => {
                if (query.length === 0) {
                    this.clearSearch();
                } else {
                    this.performSearch(query);
                }
            }, CONFIG.UI.SEARCH_DEBOUNCE);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value.trim());
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    this.performSearch(query);
                }
            });
        }

        // ホーム画面用の検索イベント
        const homeSearchInput = getElement('#homeSearchInput');
        if (homeSearchInput) {
            const debouncedHomeSearch = debounce((query) => {
                if (query.length === 0) {
                    this.clearHomeSearch();
                } else {
                    this.performHomeSearch(query);
                }
            }, CONFIG.UI.SEARCH_DEBOUNCE);

            homeSearchInput.addEventListener('input', (e) => {
                debouncedHomeSearch(e.target.value.trim());
            });

            homeSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    this.performHomeSearch(query);
                }
            });
        }
    }

    /**
     * 入力検証をバインド
     */
    bindInputValidation() {
        const questionInput = getElement('#cardQuestion');
        if (questionInput) {
            questionInput.addEventListener('input', (e) => {
                const remaining = CONFIG.LIMITS.QUESTION_MAX_LENGTH - e.target.value.length;
                if (remaining < 10) {
                    e.target.style.borderColor = remaining < 5 ? '#dc3545' : '#ffc107';
                } else {
                    e.target.style.borderColor = '#e0e0e0';
                }
            });
        }

        const answerInput = getElement('#cardAnswer');
        if (answerInput) {
            answerInput.addEventListener('input', (e) => {
                const remaining = CONFIG.LIMITS.ANSWER_MAX_LENGTH - e.target.value.length;
                if (remaining < 20) {
                    e.target.style.borderColor = remaining < 10 ? '#dc3545' : '#ffc107';
                } else {
                    e.target.style.borderColor = '#e0e0e0';
                }
            });
        }
    }

    /**
     * キーボードショートカットをバインド
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter で新しいカードを追加
            if (e.ctrlKey && e.key === 'Enter') {
                const questionInput = getElement('#cardQuestion');
                const answerInput = getElement('#cardAnswer');
                if (document.activeElement !== questionInput && document.activeElement !== answerInput) {
                    questionInput?.focus();
                }
            }

            // Escape で編集をキャンセル
            if (e.key === 'Escape' && this.editingId !== null) {
                this.cancelEdit();
            }
        });
    }

    /**
     * URLハッシュに基づいて画面を切り替え
     */
    handleHashChange() {
        const hash = window.location.hash.substring(1) || 'home';
        const validScreens = ['home', 'register', 'search', 'settings'];

        if (validScreens.includes(hash)) {
            this.switchScreen(hash);
        } else {
            this.switchScreen('home');
        }
    }

    /**
     * 画面を切り替える
     * @param {string} screenName - 画面名
     */
    switchScreen(screenName) {
        this.currentScreen = screenName;

        // すべての画面を非表示
        getElements('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // すべてのナビゲーションアイテムを非アクティブ
        getElements('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 指定された画面を表示
        const targetScreen = getElement(`#${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        // 対応するナビゲーションアイテムをアクティブ
        const targetNavItem = getElement(`.nav-item[data-screen="${screenName}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }

        // 画面に応じた初期化処理
        switch (screenName) {
            case 'home':
                this.initHomeScreen();
                break;
            case 'register':
                this.initRegisterScreen();
                break;
            case 'search':
                this.initSearchScreen();
                break;
            case 'settings':
                this.initSettingsScreen();
                break;
        }
    }

    /**
     * 登録画面の初期化
     */
    initRegisterScreen() {
        console.log('initRegisterScreen called');
        // 登録画面では特別な初期化は不要
        // カード一覧は表示しない
    }

    /**
     * ホーム画面の初期化
     */
    initHomeScreen() {
        console.log('initHomeScreen called');
        // ホーム画面では常に「学習中」フィルターを適用
        this.currentFilter = 'active';
        this.homeSearchQuery = '';
        
        // ホーム画面用の検索入力をクリア
        const homeSearchInput = getElement('#homeSearchInput');
        if (homeSearchInput) {
            homeSearchInput.value = '';
        }
        
        // 検索結果表示をリセット
        const homeSearchInfo = getElement('#homeSearchInfo');
        if (homeSearchInfo) {
            homeSearchInfo.style.display = 'none';
        }
        
        const homeClearSearchBtn = getElement('#homeClearSearchBtn');
        if (homeClearSearchBtn) {
            homeClearSearchBtn.style.display = 'none';
        }
        
        console.log('About to call renderHomeScreen');
        this.renderHomeScreen();
        console.log('About to call updateHomeStats');
        this.updateHomeStats();
        console.log('initHomeScreen completed');
    }

    /**
     * 検索画面の初期化
     */
    initSearchScreen() {
        // 検索画面でも「学習中」フィルターをデフォルトに設定
        this.currentFilter = 'active';
        
        // フィルターボタンのアクティブ状態を更新
        getElements('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = getElement('.filter-btn[onclick*="active"]');
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.renderSearchResults();
        
        const searchCardCount = getElement('#searchCardCount');
        if (searchCardCount) {
            const filteredCards = this.getFilteredCards();
            searchCardCount.textContent = `${filteredCards.length}枚のカード`;
        }
    }

    /**
     * 設定画面の初期化
     */
    initSettingsScreen() {
        const enableDarkMode = getElement('#settingsEnableDarkMode');
        const reviewCount = getElement('#settingsReviewCount');
        const enableNotifications = getElement('#settingsEnableNotifications');

        const darkModeSettings = this.settingsService.getDarkModeSettings();
        const forgettingSettings = this.settingsService.getForgettingSettings();

        if (enableDarkMode) {
            enableDarkMode.checked = darkModeSettings.enabled;
        }

        if (reviewCount) {
            reviewCount.value = forgettingSettings.reviewCount;
            this.generateSettingsIntervalInputs();
        }

        if (enableNotifications) {
            enableNotifications.checked = forgettingSettings.notifications;
        }

        this.updateForgettingStatus();
    }

    /**
     * テーマを適用
     */
    applyTheme() {
        const darkModeSettings = this.settingsService.getDarkModeSettings();
        if (darkModeSettings.enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * 新しいカードを追加
     */
    addCard() {
        const questionInput = getElement('#cardQuestion');
        const answerInput = getElement('#cardAnswer');
        const tagsInput = getElement('#cardTags');
        
        if (!questionInput || !answerInput || !tagsInput) return;

        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();
        const tagsText = tagsInput.value.trim();

        // バリデーション
        if (question === '') {
            showNotification('問題を入力してください', 'error');
            questionInput.focus();
            return;
        }

        if (question.length > CONFIG.LIMITS.QUESTION_MAX_LENGTH) {
            showNotification(`問題は${CONFIG.LIMITS.QUESTION_MAX_LENGTH}文字以内で入力してください`, 'error');
            return;
        }

        if (answer.length > CONFIG.LIMITS.ANSWER_MAX_LENGTH) {
            showNotification(`解説は${CONFIG.LIMITS.ANSWER_MAX_LENGTH}文字以内で入力してください`, 'error');
            return;
        }

        // カードを追加
        const cardData = {
            question,
            answer,
            tags: tagsText ? this.processTags(tagsText) : [],
            relatedCards: [...this.newCardRelatedCards], // 新規カード作成時の関連カードを追加
            urls: [...this.newCardUrls], // 新規カード作成時のURLを追加
            images: [...this.newCardImages], // 新規カード作成時の画像情報を追加
            imageData: { ...this.newCardImageData } // 新規カード作成時の画像データを追加
        };

        const card = this.cardService.addCard(cardData);

        // 展開状態を設定
        if (answer && answer.trim() !== '') {
            this.expandedCards.add(card.id);
        }

        // UI更新
        this.render();
        this.updateStats();

        // フォームをクリア
        questionInput.value = '';
        answerInput.value = '';
        tagsInput.value = '';
        questionInput.style.borderColor = '#e0e0e0';
        
        // 新規カード作成時の関連カードもクリア
        this.newCardRelatedCards = [];
        this.updateNewCardRelatedCardsCount();
        
        // 新規カード作成時のURL・画像データもクリア
        this.newCardUrls = [];
        this.newCardImages = [];
        this.newCardImageData = {};
        this.updateNewCardUrlsList();
        this.updateNewCardImagesList();
        
        answerInput.style.borderColor = '#e0e0e0';
        tagsInput.style.borderColor = '#e0e0e0';
        questionInput.focus();

        showNotification('カードを追加しました', 'success');
    }

    /**
     * 新規カード作成時の関連カード数を更新
     */
    updateNewCardRelatedCardsCount() {
        const countElement = getElement('#relatedCardsCount');
        if (countElement) {
            countElement.textContent = `(${this.newCardRelatedCards.length})`;
        }
    }

    /**
     * 新規カード作成時のURLリストを更新
     */
    updateNewCardUrlsList() {
        const urlsList = getElement('#newCardUrlsList');
        if (!urlsList) return;

        if (this.newCardUrls.length === 0) {
            urlsList.innerHTML = '<div class="no-urls">URLが登録されていません</div>';
            return;
        }

        const urlsHtml = this.newCardUrls.map(url => {
            const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
            return `
                <div class="editable-url-item">
                    <a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="url-link">
                        🔗 ${this.escapeHtml(displayUrl)}
                    </a>
                    <button type="button" class="remove-url-btn" onclick="removeUrlFromNewCard('${this.escapeHtml(url)}')">
                        削除
                    </button>
                </div>
            `;
        }).join('');

        urlsList.innerHTML = urlsHtml;
    }

    /**
     * 新規カード作成時の画像リストを更新
     */
    updateNewCardImagesList() {
        const imagesList = getElement('#newCardImagesList');
        if (!imagesList) return;

        if (this.newCardImages.length === 0) {
            imagesList.innerHTML = '<div class="no-images">画像が登録されていません</div>';
            return;
        }

        const imagesHtml = this.newCardImages.map(imageInfo => {
            const imageData = this.newCardImageData[imageInfo.id];
            if (!imageData) return '';

            return `
                <div class="editable-image-item">
                    <img src="${imageData}" alt="${this.escapeHtml(imageInfo.name)}" class="edit-image-thumbnail">
                    <div class="image-details">
                        <div class="image-name">${this.escapeHtml(imageInfo.name)}</div>
                        <div class="image-size">${this.formatFileSize(imageInfo.size)}</div>
                    </div>
                    <button type="button" class="remove-image-btn" onclick="removeImageFromNewCard('${imageInfo.id}')">
                        削除
                    </button>
                </div>
            `;
        }).join('');

        imagesList.innerHTML = imagesHtml;
    }

    /**
     * 新規カード作成時にURLを追加
     * @param {string} url - 追加するURL
     */
    addUrlToNewCard(url) {
        if (!url || typeof url !== 'string' || url.trim() === '') {
            throw new Error('有効なURLを入力してください');
        }

        const trimmedUrl = url.trim();
        
        // URL形式チェック
        try {
            new URL(trimmedUrl);
        } catch (e) {
            throw new Error('URLの形式が正しくありません');
        }

        // 長さチェック
        if (trimmedUrl.length > CONFIG.LIMITS.URL_MAX_LENGTH) {
            throw new Error(`URLは${CONFIG.LIMITS.URL_MAX_LENGTH}文字以内で入力してください`);
        }

        // 重複チェック
        if (this.newCardUrls.includes(trimmedUrl)) {
            throw new Error('このURLは既に登録されています');
        }

        // 上限チェック
        if (this.newCardUrls.length >= CONFIG.LIMITS.URLS_MAX_COUNT) {
            throw new Error(`URLは${CONFIG.LIMITS.URLS_MAX_COUNT}個まで登録できます`);
        }

        this.newCardUrls.push(trimmedUrl);
        this.updateNewCardUrlsList();
        return true;
    }

    /**
     * 新規カード作成時にURLを削除
     * @param {string} url - 削除するURL
     */
    removeUrlFromNewCard(url) {
        const index = this.newCardUrls.indexOf(url);
        if (index === -1) {
            return false;
        }

        this.newCardUrls.splice(index, 1);
        this.updateNewCardUrlsList();
        return true;
    }

    /**
     * 新規カード作成時に画像を追加
     * @param {File} file - 画像ファイル
     * @returns {Promise<string>} 画像ID
     */
    async addImageToNewCard(file) {
        if (!file || !(file instanceof File)) {
            throw new Error('有効な画像ファイルを選択してください');
        }

        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) {
            throw new Error('画像ファイルのみアップロード可能です');
        }

        // ファイルサイズチェック
        if (file.size > CONFIG.LIMITS.IMAGE_MAX_SIZE) {
            throw new Error(`画像ファイルは${CONFIG.LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB以下にしてください`);
        }

        // 上限チェック
        if (this.newCardImages.length >= CONFIG.LIMITS.IMAGES_MAX_COUNT) {
            throw new Error(`画像は${CONFIG.LIMITS.IMAGES_MAX_COUNT}個まで登録できます`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const imageInfo = {
                        id: imageId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        uploadedAt: new Date().toISOString()
                    };

                    this.newCardImages.push(imageInfo);
                    this.newCardImageData[imageId] = e.target.result;
                    this.updateNewCardImagesList();
                    
                    resolve(imageId);
                } catch (error) {
                    reject(new Error('画像の処理中にエラーが発生しました'));
                }
            };

            reader.onerror = () => {
                reject(new Error('画像ファイルの読み込みに失敗しました'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * 新規カード作成時に画像を削除
     * @param {string} imageId - 画像ID
     */
    removeImageFromNewCard(imageId) {
        const index = this.newCardImages.findIndex(img => img.id === imageId);
        if (index === -1) {
            return false;
        }

        this.newCardImages.splice(index, 1);
        delete this.newCardImageData[imageId];
        this.updateNewCardImagesList();
        return true;
    }

    /**
     * HTMLエスケープ処理
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * ファイルサイズをフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマットされたサイズ
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 新規カード作成時の関連カードを設定
     * @param {number[]} relatedCardIds - 関連カードのID配列
     */
    setNewCardRelatedCards(relatedCardIds) {
        this.newCardRelatedCards = [...relatedCardIds];
        this.updateNewCardRelatedCardsCount();
    }

    /**
     * 新規カード作成時の関連カードを取得
     * @returns {number[]} 関連カードのID配列
     */
    getNewCardRelatedCards() {
        return [...this.newCardRelatedCards];
    }

    /**
     * 新規カード作成時の関連カードをクリア
     */
    clearNewCardRelatedCards() {
        this.newCardRelatedCards = [];
        this.updateNewCardRelatedCardsCount();
    }

    /**
     * カードを削除
     * @param {number} id - カードID
     */
    deleteCard(id) {
        const cardElement = getElement(`[data-id="${id}"]`);
        if (cardElement) {
            cardElement.classList.add('removing');
            setTimeout(() => {
                this.cardService.deleteCard(id);
                
                if (this.currentScreen === 'search') {
                    this.renderSearchResults();
                } else {
                    this.render();
                }
                
                this.updateStats();
                showNotification('カードを削除しました', 'success');
            }, 300);
        }
    }

    /**
     * カードの習得状態を切り替え
     * @param {number} id - カードID
     */
    toggleCard(id) {
        const card = this.cardService.toggleCardCompletion(id);
        if (card) {
            // 忘却曲線が有効な場合、次の復習日を設定
            const forgettingSettings = this.settingsService.getForgettingSettings();
            if (card.completed && forgettingSettings.enabled) {
                this.cardService.scheduleCardReview(id, forgettingSettings);
            }

            this.render();
            if (this.currentScreen === 'search') {
                this.renderSearchResults();
            }
            this.updateStats();
            this.updateForgettingStatus();

            const message = card.completed ? 'カードを習得済みにしました' : 'カードを学習中に戻しました';
            showNotification(message, 'success');
        }
    }

    /**
     * お気に入り状態を切り替え
     * @param {number} id - カードID
     */
    toggleFavorite(id) {
        const card = this.cardService.toggleCardFavorite(id);
        
        if (card) {
            // カードの要素を直接更新（レンダリング前に即座に反映）
            const cardElement = document.querySelector(`[data-id="${id}"]`);
            if (cardElement) {
                if (card.favorite) {
                    cardElement.classList.add('favorite');
                } else {
                    cardElement.classList.remove('favorite');
                }
                
                // ボタンの状態も更新
                const favoriteBtn = cardElement.querySelector('.favorite-btn');
                if (favoriteBtn) {
                    if (card.favorite) {
                        favoriteBtn.classList.add('active');
                        favoriteBtn.title = 'お気に入りから削除';
                    } else {
                        favoriteBtn.classList.remove('active');
                        favoriteBtn.title = 'お気に入りに追加';
                    }
                }
            }
            
            // 全体を再レンダリング
            if (this.currentScreen === 'search') {
                this.renderSearchResults();
            } else {
                this.render();
            }

            const message = card.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました';
            showNotification(message, 'success');
        }
    }

    /**
     * カードを編集モードにする
     * @param {number} id - カードID
     */
    editCard(id) {
        console.log('editCard called with id:', id);
        
        if (this.editingId !== null) {
            this.cancelEdit();
        }

        const card = this.cardService.getCardById(id);
        if (!card) {
            console.error('Card not found:', id);
            return;
        }

        if (card.completed) {
            showNotification('習得済みのカードは編集できません', 'warning');
            return;
        }

        this.editingId = id;
        console.log('Setting editingId to:', id);
        
        this.render();

        // 編集用入力フィールドにフォーカス
        setTimeout(() => {
            const editQuestionInput = getElement('.edit-question-input');
            if (editQuestionInput) {
                editQuestionInput.focus();
                editQuestionInput.select();
                console.log('Focus set to edit input');
            } else {
                console.error('Edit question input not found');
            }
        }, 100);
    }

    /**
     * カードの編集を保存
     * @param {number} id - カードID
     */
    saveCard(id) {
        const editQuestionInput = getElement('.edit-question-input');
        const editAnswerInput = getElement('.edit-answer-input');
        const editTagsInput = getElement('.edit-tags-input');

        if (!editQuestionInput || !editAnswerInput || !editTagsInput) return;

        const newQuestion = editQuestionInput.value.trim();
        const newAnswer = editAnswerInput.value.trim();
        const newTagsText = editTagsInput.value.trim();

        // バリデーション
        if (newQuestion === '') {
            showNotification('問題を入力してください', 'error');
            editQuestionInput.focus();
            return;
        }

        if (newQuestion.length > CONFIG.LIMITS.QUESTION_MAX_LENGTH) {
            showNotification(`問題は${CONFIG.LIMITS.QUESTION_MAX_LENGTH}文字以内で入力してください`, 'error');
            return;
        }

        if (newAnswer.length > CONFIG.LIMITS.ANSWER_MAX_LENGTH) {
            showNotification(`解説は${CONFIG.LIMITS.ANSWER_MAX_LENGTH}文字以内で入力してください`, 'error');
            return;
        }

        // カードを更新
        const updates = {
            question: newQuestion,
            answer: newAnswer,
            tags: newTagsText ? this.processTags(newTagsText) : []
        };

        this.cardService.updateCard(id, updates);
        this.editingId = null;

        if (this.currentScreen === 'search') {
            this.renderSearchResults();
        } else {
            this.render();
        }

        showNotification('カードを更新しました', 'success');
    }

    /**
     * 編集をキャンセル
     */
    cancelEdit() {
        this.editingId = null;
        this.render();
    }

    /**
     * フラッシュカードの展開/折りたたみを切り替え
     * @param {number} id - カードID
     */
    toggleFlashcard(id) {
        if (this.expandedCards.has(id)) {
            this.expandedCards.delete(id);
        } else {
            this.expandedCards.add(id);
        }

        // 該当するカードのみを更新
        const cardElement = getElement(`[data-id="${id}"]`);
        if (cardElement) {
            const card = this.cardService.getCardById(id);
            if (card) {
                const flashcardSettings = this.settingsService.getFlashcardSettings();
                const isExpanded = this.expandedCards.has(id);
                const relatedCards = this.cardService.getAllCards();
                
                cardElement.outerHTML = UIComponents.renderCard(card, {
                    isExpanded,
                    searchQuery: this.searchQuery,
                    flashcardMode: flashcardSettings.enabled,
                    relatedCards
                });
            }
        }

        this.updateBulkControl();
    }

    /**
     * フィルターを適用
     * @param {string} filter - フィルター名
     */
    filterCards(filter) {
        this.currentFilter = filter;

        // フィルターボタンのアクティブ状態を更新
        getElements('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = getElement(`.filter-btn[onclick*="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        if (this.currentScreen === 'search') {
            this.renderSearchResults();
        } else {
            this.render();
        }
    }

    /**
     * お気に入りフィルターを適用
     */
    filterFavorites() {
        this.currentFilter = this.currentFilter === 'favorites' ? 'all' : 'favorites';

        // フィルターボタンのアクティブ状態を更新
        getElements('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (this.currentFilter === 'favorites') {
            const favoritesBtn = getElement('#favoritesFilterBtn');
            if (favoritesBtn) favoritesBtn.classList.add('active');
        } else {
            const allBtn = getElement('.filter-btn[onclick*="all"]');
            if (allBtn) allBtn.classList.add('active');
        }

        if (this.currentScreen === 'search') {
            this.renderSearchResults();
        } else {
            this.render();
        }
    }

    /**
     * 習得済みのカードをすべて削除
     */
    clearCompleted() {
        const completedCount = this.cardService.getStats().completed;

        if (completedCount === 0) {
            showNotification('習得済みのカードがありません', 'info');
            return;
        }

        if (confirm(`${completedCount}枚の習得済みカードを削除しますか？`)) {
            this.cardService.clearCompletedCards();

            if (this.currentScreen === 'search') {
                this.renderSearchResults();
            } else {
                this.render();
            }

            this.updateStats();
            showNotification(`${completedCount}枚のカードを削除しました`, 'success');
        }
    }

    /**
     * フィルターされたカードを取得
     * @returns {Card[]} フィルタリングされたカードの配列
     */
    getFilteredCards() {
        const sortSettings = this.settingsService.getSortSettings();
        
        return this.cardService.getFilteredCards({
            searchQuery: this.searchQuery,
            selectedTags: this.selectedTags,
            status: this.currentFilter,
            sortField: sortSettings.field,
            sortDirection: sortSettings.direction
        });
    }

    /**
     * ソート設定を変更
     * @param {string} field - ソートフィールド
     */
    changeSortOrder(field) {
        const newSettings = this.settingsService.changeSortOrder(field);
        this.render();
        this.updateSortButtons();

        const fieldName = field === 'createdAt' ? '登録日時' : '更新日時';
        const directionName = newSettings.direction === 'asc' ? '古い順' : '新しい順';
        showNotification(`${fieldName}の${directionName}でソートしました`, 'info');
    }

    /**
     * ソートボタンの状態を更新
     */
    updateSortButtons() {
        const sortSettings = this.settingsService.getSortSettings();
        const sortButtons = getElements('.sort-btn');
        
        sortButtons.forEach(btn => {
            const field = btn.dataset.field;

            if (field === sortSettings.field) {
                btn.classList.add('active');
                const directionIndicator = btn.querySelector('.sort-direction');
                if (directionIndicator) {
                    directionIndicator.textContent = sortSettings.direction === 'asc' ? '▲' : '▼';
                }
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * タグを処理する
     * @param {string} tagsText - カンマ区切りのタグテキスト
     * @returns {string[]} 処理されたタグの配列
     */
    processTags(tagsText) {
        return [...new Set(tagsText.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '')
            .map(tag => tag.toLowerCase()))];
    }

    /**
     * カードリストをレンダリング
     */
    render() {
        const cardList = getElement('#cardList');
        const emptyState = getElement('#emptyState');

        if (!cardList || !emptyState) return;

        const filteredCards = this.getFilteredCards();
        const flashcardSettings = this.settingsService.getFlashcardSettings();
        const relatedCards = this.cardService.getAllCards();

        if (filteredCards.length === 0) {
            cardList.style.display = 'none';
            emptyState.classList.add('show');

            const messages = {
                all: 'カードがありません。新しいカードを追加してください。',
                active: '学習中のカードがありません。',
                completed: '習得済みのカードがありません。',
                favorites: 'お気に入りのカードがありません。'
            };
            emptyState.querySelector('p').textContent = messages[this.currentFilter] || messages.all;
        } else {
            cardList.style.display = 'block';
            emptyState.classList.remove('show');
        }

        cardList.innerHTML = filteredCards.map(card => {
            const isEditing = this.editingId === card.id;
            const isExpanded = this.expandedCards.has(card.id);
            
            return UIComponents.renderCard(card, {
                isEditing,
                isExpanded,
                searchQuery: this.searchQuery,
                flashcardMode: flashcardSettings.enabled,
                relatedCards
            });
        }).join('');

        this.updateBulkControl();
    }

    /**
     * 検索結果をレンダリング
     */
    renderSearchResults() {
        const searchCardList = getElement('#searchCardList');
        const searchEmptyState = getElement('#searchEmptyState');

        if (!searchCardList || !searchEmptyState) return;

        const filteredCards = this.getFilteredCards();
        const flashcardSettings = this.settingsService.getFlashcardSettings();
        const relatedCards = this.cardService.getAllCards();

        if (filteredCards.length === 0) {
            searchCardList.style.display = 'none';
            searchEmptyState.classList.add('show');

            const messages = {
                all: '検索結果がありません。別のキーワードで検索してください。',
                active: '学習中のカードがありません。',
                completed: '習得済みのカードがありません。',
                favorites: 'お気に入りのカードがありません。'
            };
            searchEmptyState.querySelector('p').textContent = messages[this.currentFilter] || messages.all;
        } else {
            searchCardList.style.display = 'block';
            searchEmptyState.classList.remove('show');
        }

        searchCardList.innerHTML = filteredCards.map(card => {
            const isEditing = this.editingId === card.id;
            const isExpanded = this.expandedCards.has(card.id);
            
            return UIComponents.renderCard(card, {
                isEditing,
                isExpanded,
                searchQuery: this.searchQuery,
                flashcardMode: flashcardSettings.enabled,
                relatedCards
            });
        }).join('');
    }

    /**
     * 統計情報を更新
     */
    updateStats() {
        const stats = this.cardService.getStats();
        const cardCount = getElement('#cardCount');
        const clearCompleted = getElement('#clearCompleted');

        if (cardCount) {
            cardCount.textContent = UIComponents.renderStats(stats);
        }

        if (clearCompleted) {
            clearCompleted.disabled = stats.completed === 0;
            clearCompleted.style.opacity = stats.completed === 0 ? '0.5' : '1';
        }

        this.updateBulkControl();
        this.updateSortButtons();
    }

    /**
     * 一括表示コントロールを更新
     */
    updateBulkControl() {
        const bulkControl = getElement('#bulkControl');
        const expandAllBtn = getElement('#expandAllBtn');
        const collapseAllBtn = getElement('#collapseAllBtn');
        const expandedCount = getElement('#expandedCount');

        if (!bulkControl) return;

        const flashcardSettings = this.settingsService.getFlashcardSettings();
        const allCards = this.cardService.getAllCards();

        if (flashcardSettings.enabled && allCards.length > 0) {
            bulkControl.classList.add('show');

            const cardsWithAnswers = allCards.filter(card => card.answer && card.answer.trim() !== '');
            const expandedCardsCount = this.expandedCards.size;

            if (expandAllBtn) expandAllBtn.disabled = expandedCardsCount >= cardsWithAnswers.length;
            if (collapseAllBtn) collapseAllBtn.disabled = expandedCardsCount === 0;
            if (expandedCount) expandedCount.textContent = `${expandedCardsCount}枚展開中`;
        } else {
            bulkControl.classList.remove('show');
        }
    }

    /**
     * すべてのカードを展開
     */
    expandAllCards() {
        this.cardService.getAllCards().forEach(card => {
            if (card.answer && card.answer.trim() !== '') {
                this.expandedCards.add(card.id);
            }
        });
        this.render();
        this.updateBulkControl();
        showNotification('すべてのカードを展開しました', 'success');
    }

    /**
     * すべてのカードを閉じる
     */
    collapseAllCards() {
        this.expandedCards.clear();
        this.render();
        this.updateBulkControl();
        showNotification('すべてのカードを閉じました', 'success');
    }

    /**
     * 検索を実行
     * @param {string} query - 検索クエリ
     */
    performSearch(query = null) {
        const searchInput = getElement('#searchInput');
        const searchInfo = getElement('#searchInfo');
        const clearSearchBtn = getElement('#clearSearchBtn');
        const searchResults = getElement('#searchResults');

        if (!searchInput || !searchInfo || !clearSearchBtn || !searchResults) {
            console.error('検索関連の要素が見つかりません');
            return;
        }

        if (query === null) {
            query = searchInput.value.trim();
        }

        this.searchQuery = query;

        if (query === '') {
            this.clearSearch();
            return;
        }

        const results = this.cardService.getFilteredCards({ searchQuery: query });

        searchInfo.style.display = 'block';
        clearSearchBtn.style.display = 'block';
        searchResults.textContent = `"${query}" で ${results.length}件見つかりました`;

        window.location.hash = 'search';
        this.renderSearchResults();

        const searchCardCount = getElement('#searchCardCount');
        if (searchCardCount) {
            searchCardCount.textContent = `${results.length}枚のカード`;
        }

        showNotification(`${results.length}件のカードが見つかりました`, 'info');
    }

    /**
     * 検索をクリア
     */
    clearSearch() {
        const searchInput = getElement('#searchInput');
        const searchInfo = getElement('#searchInfo');
        const clearSearchBtn = getElement('#clearSearchBtn');

        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (searchInfo) searchInfo.style.display = 'none';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';

        this.renderSearchResults();

        const searchCardCount = getElement('#searchCardCount');
        if (searchCardCount) {
            const filteredCards = this.getFilteredCards();
            searchCardCount.textContent = `${filteredCards.length}枚のカード`;
        }

        showNotification('検索をクリアしました', 'info');
    }

    /**
     * ホーム画面で検索を実行
     * @param {string} query - 検索クエリ
     */
    performHomeSearch(query = null) {
        const homeSearchInput = getElement('#homeSearchInput');
        const homeSearchInfo = getElement('#homeSearchInfo');
        const homeClearSearchBtn = getElement('#homeClearSearchBtn');
        const homeSearchResults = getElement('#homeSearchResults');

        if (!homeSearchInput || !homeSearchInfo || !homeClearSearchBtn || !homeSearchResults) {
            console.error('ホーム画面の検索関連要素が見つかりません');
            return;
        }

        if (query === null) {
            query = homeSearchInput.value.trim();
        }

        this.homeSearchQuery = query;

        if (query === '') {
            this.clearHomeSearch();
            return;
        }

        // 学習中のカードのみを検索対象とする
        const results = this.cardService.getFilteredCards({
            status: 'active',
            searchQuery: query,
            selectedTags: this.selectedTags
        });

        homeSearchInfo.style.display = 'block';
        homeClearSearchBtn.style.display = 'block';
        homeSearchResults.textContent = `"${query}" で ${results.length}件見つかりました`;

        this.renderHomeScreen();
        this.updateHomeStats();

        showNotification(`${results.length}件のカードが見つかりました`, 'info');
    }

    /**
     * ホーム画面の検索をクリア
     */
    clearHomeSearch() {
        const homeSearchInput = getElement('#homeSearchInput');
        const homeSearchInfo = getElement('#homeSearchInfo');
        const homeClearSearchBtn = getElement('#homeClearSearchBtn');

        this.homeSearchQuery = '';
        if (homeSearchInput) homeSearchInput.value = '';
        if (homeSearchInfo) homeSearchInfo.style.display = 'none';
        if (homeClearSearchBtn) homeClearSearchBtn.style.display = 'none';

        this.renderHomeScreen();
        this.updateHomeStats();

        showNotification('検索をクリアしました', 'info');
    }

    /**
     * 忘却曲線をチェック
     */
    checkForgettingCurve() {
        const forgettingSettings = this.settingsService.getForgettingSettings();
        const reviewedCount = this.cardService.checkForgettingCurve(forgettingSettings);

        if (reviewedCount > 0) {
            this.render();
            this.updateStats();
            this.updateForgettingStatus();

            if (forgettingSettings.notifications) {
                showNotification(
                    `${reviewedCount}枚のカードが復習のため学習中に戻りました`,
                    'info'
                );
            }
        }
    }

    /**
     * 忘却曲線ステータスを更新
     */
    updateForgettingStatus() {
        const forgettingStatus = getElement('#forgettingStatus');
        const reviewSchedule = getElement('#reviewSchedule');

        if (!forgettingStatus || !reviewSchedule) return;

        const reviewCards = this.cardService.getCardsNeedingReview()
            .sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));

        if (reviewCards.length === 0) {
            forgettingStatus.classList.remove('show');
            return;
        }

        forgettingStatus.classList.add('show');
        reviewSchedule.innerHTML = UIComponents.renderReviewSchedule(reviewCards);
    }

    /**
     * 設定画面用の復習間隔入力フィールドを動的に生成
     */
    generateSettingsIntervalInputs() {
        const container = getElement('#settingsIntervalSettingsContainer');
        if (!container) return;

        const reviewCountInput = getElement('#settingsReviewCount');
        const reviewCount = parseInt(reviewCountInput?.value) || 5;
        const forgettingSettings = this.settingsService.getForgettingSettings();

        container.innerHTML = '';

        for (let i = 0; i < reviewCount; i++) {
            const intervalItem = document.createElement('div');
            intervalItem.className = 'interval-item';

            const label = document.createElement('label');
            label.textContent = `${i + 1}回目の復習:`;

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `settingsInterval${i + 1}`;
            input.min = '1';

            if (i < 2) input.max = '30';
            else if (i < 4) input.max = '60';
            else if (i < 6) input.max = '90';
            else input.max = '180';

            if (i < forgettingSettings.intervals.length) {
                input.value = forgettingSettings.intervals[i];
            } else {
                const prevInterval = i > 0 ? parseInt(forgettingSettings.intervals[i - 1]) || 7 : 7;
                input.value = Math.min(parseInt(input.max), Math.max(7, prevInterval * 2));
            }

            const span = document.createElement('span');
            span.textContent = '日後';

            intervalItem.appendChild(label);
            intervalItem.appendChild(input);
            intervalItem.appendChild(span);

            container.appendChild(intervalItem);
        }
    }

    /**
     * ダークモードを切り替え
     */
    toggleDarkMode() {
        this.settingsService.toggleDarkMode();
        this.applyTheme();
    }

    /**
     * 特定のカードまでスクロール
     * @param {number} cardId - カードID
     */
    scrollToCard(cardId) {
        const cardElement = getElement(`[data-id="${cardId}"]`);
        if (cardElement) {
            if (cardElement.offsetParent === null) {
                this.currentFilter = 'all';
                this.selectedTags = [];
                this.searchQuery = '';
                this.render();

                setTimeout(() => {
                    const updatedCardElement = getElement(`[data-id="${cardId}"]`);
                    if (updatedCardElement) {
                        updatedCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        updatedCardElement.classList.add('highlight-card');
                        setTimeout(() => {
                            updatedCardElement.classList.remove('highlight-card');
                        }, 2000);
                    }
                }, 100);
            } else {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardElement.classList.add('highlight-card');
                setTimeout(() => {
                    cardElement.classList.remove('highlight-card');
                }, 2000);
            }
        }
    }

    /**
     * タグフィルターを切り替え
     * @param {string} tag - タグ名
     */
    toggleTagFilter(tag) {
        if (!tag) return;

        const index = this.selectedTags.indexOf(tag);
        if (index === -1) {
            this.selectedTags.push(tag);
        } else {
            this.selectedTags.splice(index, 1);
        }
        this.render();

        if (this.selectedTags.length > 0) {
            showNotification(`タグ「${this.selectedTags.join('、')}」でフィルター中`, 'info');
        } else {
            showNotification('タグフィルターをクリアしました', 'info');
        }
    }

    /**
     * 関連カードを設定
     * @param {number} cardId - カードID
     * @param {number[]} relatedCardIds - 関連カードのIDの配列
     */
    setRelatedCards(cardId, relatedCardIds) {
        console.log('setRelatedCards called:', { cardId, relatedCardIds });
        
        this.cardService.setRelatedCards(cardId, relatedCardIds);
        this.render();
        
        showNotification(`${relatedCardIds.length}枚のカードを双方向に関連付けました`, 'success');
        console.log('Related cards set successfully');
    }

    /**
     * ホーム画面のカード一覧をレンダリング
     */
    renderHomeScreen() {
        console.log('renderHomeScreen called');
        const container = getElement('#homeCardsContainer');
        if (!container) {
            console.error('homeCardsContainer not found');
            return;
        }

        // 学習中のカードのみを取得
        let cards = this.cardService.getFilteredCards({
            status: 'active',
            searchQuery: this.homeSearchQuery,
            selectedTags: this.selectedTags
        });
        
        console.log('Found cards:', cards.length);
        
        // ソート適用
        const sortSettings = this.settingsService.getSortSettings();
        
        if (typeof this.cardService.sortCards === 'function') {
            cards = this.cardService.sortCards(cards, sortSettings.field, sortSettings.direction);
        } else {
            console.warn('sortCards method not available, using default order');
            // フォールバック: 手動でソート
            cards = [...cards].sort((a, b) => {
                const field = sortSettings.field || 'createdAt';
                const direction = sortSettings.direction || 'desc';
                
                let valueA = a[field];
                let valueB = b[field];
                
                if (field === 'createdAt' || field === 'updatedAt') {
                    valueA = new Date(valueA).getTime();
                    valueB = new Date(valueB).getTime();
                }
                
                if (direction === 'asc') {
                    return valueA > valueB ? 1 : -1;
                } else {
                    return valueA < valueB ? 1 : -1;
                }
            });
        }

        if (cards.length === 0) {
            const message = this.homeSearchQuery ? 
                '検索条件に一致する学習中のカードがありません。' : 
                '学習中のカードがありません。新しいカードを登録しましょう！';
            container.innerHTML = `<div class="no-cards-message">${message}</div>`;
            console.log('No cards found, showing message');
            return;
        }

        try {
            const renderedCards = cards.map(card => 
                UIComponents.renderCard(card, {
                    isExpanded: this.expandedCards.has(card.id),
                    searchQuery: this.homeSearchQuery,
                    flashcardMode: true
                })
            ).join('');
            
            container.innerHTML = renderedCards;
            console.log('Cards rendered successfully:', cards.length);
        } catch (error) {
            console.error('Error rendering cards:', error);
            container.innerHTML = '<div class="error-message">カードの表示中にエラーが発生しました。</div>';
        }
    }

    /**
     * ホーム画面の統計情報を更新
     */
    updateHomeStats() {
        const homeCardCount = getElement('#homeCardCount');
        if (!homeCardCount) return;

        // 学習中のカードのみを取得
        let cards = this.cardService.getFilteredCards({
            status: 'active',
            searchQuery: this.homeSearchQuery,
            selectedTags: this.selectedTags
        });
        
        if (this.homeSearchQuery) {
            homeCardCount.textContent = `${cards.length}枚のカード（検索結果）`;
        } else {
            homeCardCount.textContent = `${cards.length}枚のカード`;
        }

        // 忘却曲線の状態も更新
        this.updateHomeForgettingStatus();
    }

    /**
     * ホーム画面の忘却曲線状態を更新
     */
    updateHomeForgettingStatus() {
        const statusElement = getElement('#homeForgettingStatus');
        if (!statusElement) return;

        const reviewCards = this.cardService.getCardsNeedingReview();
        if (reviewCards.length > 0) {
            statusElement.innerHTML = `<span class="review-notification">📅 復習対象: ${reviewCards.length}枚</span>`;
            statusElement.style.display = 'block';
        } else {
            statusElement.style.display = 'none';
        }
    }
}
