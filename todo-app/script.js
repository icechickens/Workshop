// 暗記カードアプリのメイン機能
class FlashcardApp {
    constructor() {
        this.cards = JSON.parse(localStorage.getItem('flashcards')) || [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.searchQuery = '';
        
        // 忘却曲線設定のデフォルト値
        this.forgettingSettings = JSON.parse(localStorage.getItem('forgettingSettings')) || {
            enabled: false,
            intervals: [1, 3, 7, 14, 30], // 日数
            notifications: true
        };
        
        // フラッシュカード設定のデフォルト値
        this.flashcardSettings = JSON.parse(localStorage.getItem('flashcardSettings')) || {
            enabled: true // デフォルトでフラッシュカードモードを有効
        };
        
        // 展開されたカードのIDを追跡
        this.expandedCards = new Set();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadSettings();
        this.checkForgettingCurve();
        this.render();
        this.updateStats();
        this.updateForgettingStatus();
        
        // 定期的に忘却曲線をチェック（1分ごと）
        setInterval(() => {
            this.checkForgettingCurve();
        }, 60000);
    }
    
    bindEvents() {
        // Enterキーでカード追加（質問フィールドから）
        document.getElementById('cardQuestion').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCard();
            }
        });
        
        // Ctrl+Enterで答えフィールドからもカード追加
        document.getElementById('cardAnswer').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.addCard();
            }
        });
        
        // クリックとダブルクリックの処理
        let clickTimer = null;
        let clickCount = 0;
        
        document.addEventListener('click', (e) => {
            const cardContent = e.target.closest('.card-content');
            if (cardContent && !e.target.closest('.card-actions')) {
                clickCount++;
                
                if (clickCount === 1) {
                    // シングルクリックの処理を遅延
                    clickTimer = setTimeout(() => {
                        if (clickCount === 1) {
                            // フラッシュカードモードでのみ詳細表示
                            if (this.flashcardSettings.enabled) {
                                const cardItem = cardContent.closest('.card-item');
                                if (cardItem) {
                                    const cardId = parseInt(cardItem.dataset.id);
                                    this.toggleFlashcard(cardId);
                                }
                            }
                        }
                        clickCount = 0;
                    }, 300);
                } else if (clickCount === 2) {
                    // ダブルクリックの処理
                    clearTimeout(clickTimer);
                    const cardItem = cardContent.closest('.card-item');
                    if (cardItem) {
                        const cardId = parseInt(cardItem.dataset.id);
                        this.editCard(cardId);
                    }
                    clickCount = 0;
                }
            }
        });
        
        // 検索機能のイベントリスナー
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                this.clearSearch();
            } else {
                this.performSearch(query);
            }
        });
        
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                this.performSearch(query);
            }
        });
        
        // 入力フィールドの文字数制限表示
        document.getElementById('cardQuestion').addEventListener('input', (e) => {
            const remaining = 50 - e.target.value.length;
            if (remaining < 10) {
                e.target.style.borderColor = remaining < 5 ? '#dc3545' : '#ffc107';
            } else {
                e.target.style.borderColor = '#e0e0e0';
            }
        });
        
        document.getElementById('cardAnswer').addEventListener('input', (e) => {
            const remaining = 200 - e.target.value.length;
            if (remaining < 20) {
                e.target.style.borderColor = remaining < 10 ? '#dc3545' : '#ffc107';
            } else {
                e.target.style.borderColor = '#e0e0e0';
            }
        });
    }
    
    // 新しいカードを追加
    addCard() {
        const questionInput = document.getElementById('cardQuestion');
        const answerInput = document.getElementById('cardAnswer');
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();
        
        if (question === '') {
            this.showNotification('質問を入力してください', 'error');
            questionInput.focus();
            return;
        }
        
        if (question.length > 50) {
            this.showNotification('質問は50文字以内で入力してください', 'error');
            return;
        }
        
        if (answer.length > 200) {
            this.showNotification('答えは200文字以内で入力してください', 'error');
            return;
        }
        
        const card = {
            id: Date.now(),
            question: question,
            answer: answer,
            completed: false,
            favorite: false, // お気に入りフラグを追加
            createdAt: new Date().toISOString(),
            // 忘却曲線関連データ
            reviewCount: 0,
            nextReviewDate: null,
            lastCompletedAt: null
        };
        
        this.cards.unshift(card);
        this.saveCards();
        this.render();
        this.updateStats();
        
        questionInput.value = '';
        answerInput.value = '';
        questionInput.style.borderColor = '#e0e0e0';
        answerInput.style.borderColor = '#e0e0e0';
        questionInput.focus();
        this.showNotification('カードを追加しました', 'success');
    }
    
    // カードをローカルストレージに保存
    saveCards() {
        localStorage.setItem('flashcards', JSON.stringify(this.cards));
    }
    
    // カードを削除
    deleteCard(id) {
        const cardElement = document.querySelector(`[data-id="${id}"]`);
        if (cardElement) {
            cardElement.classList.add('removing');
            setTimeout(() => {
                this.cards = this.cards.filter(card => card.id !== id);
                this.saveCards();
                this.render();
                this.updateStats();
                this.showNotification('カードを削除しました', 'success');
            }, 300);
        }
    }
    
    // カードの習得状態を切り替え
    toggleCard(id) {
        const card = this.cards.find(card => card.id === id);
        if (card) {
            card.completed = !card.completed;
            
            if (card.completed) {
                card.completedAt = new Date().toISOString();
                card.lastCompletedAt = new Date().toISOString();
                
                // 忘却曲線が有効な場合、次の復習日を設定
                if (this.forgettingSettings.enabled) {
                    this.scheduleNextReview(card);
                }
            } else {
                card.completedAt = null;
                // 学習中に戻した場合は次の復習日をクリア
                card.nextReviewDate = null;
            }
            
            this.saveCards();
            this.render();
            this.updateStats();
            this.updateForgettingStatus();
            
            const message = card.completed ? 'カードを習得済みにしました' : 'カードを学習中に戻しました';
            this.showNotification(message, 'success');
        }
    }
    
    // お気に入り状態を切り替え
    toggleFavorite(id) {
        const card = this.cards.find(card => card.id === id);
        if (card) {
            card.favorite = !card.favorite;
            this.saveCards();
            
            // 該当するカードのみを更新
            const cardElement = document.querySelector(`[data-id="${id}"]`);
            if (cardElement) {
                cardElement.outerHTML = this.renderCard(card);
            }
            
            const message = card.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました';
            this.showNotification(message, 'success');
        }
    }
    
    // カードを編集モードにする
    editCard(id) {
        if (this.editingId !== null) {
            this.cancelEdit();
        }
        
        this.editingId = id;
        this.render();
        
        // 編集用入力フィールドにフォーカス
        const editQuestionInput = document.querySelector('.edit-question-input');
        if (editQuestionInput) {
            editQuestionInput.focus();
            editQuestionInput.select();
        }
    }
    
    // カードの編集を保存
    saveCard(id) {
        const editQuestionInput = document.querySelector('.edit-question-input');
        const editAnswerInput = document.querySelector('.edit-answer-input');
        const newQuestion = editQuestionInput.value.trim();
        const newAnswer = editAnswerInput.value.trim();
        
        if (newQuestion === '') {
            this.showNotification('質問を入力してください', 'error');
            editQuestionInput.focus();
            return;
        }
        
        if (newQuestion.length > 50) {
            this.showNotification('質問は50文字以内で入力してください', 'error');
            return;
        }
        
        if (newAnswer.length > 200) {
            this.showNotification('答えは200文字以内で入力してください', 'error');
            return;
        }
        
        const card = this.cards.find(card => card.id === id);
        if (card) {
            card.question = newQuestion;
            card.answer = newAnswer;
            card.updatedAt = new Date().toISOString();
            this.editingId = null;
            this.saveCards();
            this.render();
            this.showNotification('カードを更新しました', 'success');
        }
    }
    
    // 編集をキャンセル
    cancelEdit() {
        this.editingId = null;
        this.render();
    }
    
    // フラッシュカードの展開/折りたたみを切り替え
    toggleFlashcard(id) {
        if (this.expandedCards.has(id)) {
            this.expandedCards.delete(id);
        } else {
            this.expandedCards.add(id);
        }
        
        // 該当するカードのみを更新
        const cardElement = document.querySelector(`[data-id="${id}"]`);
        if (cardElement) {
            const card = this.cards.find(c => c.id === id);
            if (card) {
                cardElement.outerHTML = this.renderCard(card);
            }
        }
        
        // 一括表示コントロールを更新
        this.updateBulkControl();
    }
    
    // フィルターを適用
    filterCards(filter) {
        this.currentFilter = filter;
        
        // フィルターボタンのアクティブ状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.render();
    }
    
    // お気に入りフィルターを適用
    filterFavorites() {
        this.currentFilter = this.currentFilter === 'favorites' ? 'all' : 'favorites';
        
        // フィルターボタンのアクティブ状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (this.currentFilter === 'favorites') {
            document.getElementById('favoritesFilterBtn').classList.add('active');
        } else {
            document.querySelector('.filter-btn[onclick="filterCards(\'all\')"]').classList.add('active');
        }
        
        this.render();
    }
    
    // 習得済みのカードをすべて削除
    clearCompleted() {
        const completedCount = this.cards.filter(card => card.completed).length;
        
        if (completedCount === 0) {
            this.showNotification('習得済みのカードがありません', 'info');
            return;
        }
        
        if (confirm(`${completedCount}枚の習得済みカードを削除しますか？`)) {
            this.cards = this.cards.filter(card => !card.completed);
            this.saveCards();
            this.render();
            this.updateStats();
            this.showNotification(`${completedCount}枚のカードを削除しました`, 'success');
        }
    }
    
    // フィルターされたカードを取得
    getFilteredCards() {
        let filteredCards = this.cards;
        
        // 検索フィルター
        if (this.searchQuery) {
            filteredCards = this.getSearchResults(this.searchQuery);
        }
        
        // 状態フィルター
        switch (this.currentFilter) {
            case 'active':
                return filteredCards.filter(card => !card.completed);
            case 'completed':
                return filteredCards.filter(card => card.completed);
            case 'favorites':
                return filteredCards.filter(card => card.favorite);
            default:
                return filteredCards;
        }
    }
    
    // カードリストをレンダリング
    render() {
        const cardList = document.getElementById('cardList');
        const emptyState = document.getElementById('emptyState');
        const filteredCards = this.getFilteredCards();
        
        if (filteredCards.length === 0) {
            cardList.style.display = 'none';
            emptyState.classList.add('show');
            
            // フィルター別の空状態メッセージ
            const messages = {
                all: 'カードがありません。新しいカードを追加してください。',
                active: '学習中のカードがありません。',
                completed: '習得済みのカードがありません。'
            };
            emptyState.querySelector('p').textContent = messages[this.currentFilter];
        } else {
            cardList.style.display = 'block';
            emptyState.classList.remove('show');
        }
        
        cardList.innerHTML = filteredCards.map(card => {
            if (this.editingId === card.id) {
                return this.renderEditingCard(card);
            } else {
                return this.renderCard(card);
            }
        }).join('');
        
        // 一括表示コントロールを更新
        this.updateBulkControl();
    }
    
    // 通常のカードアイテムをレンダリング
    renderCard(card) {
        const createdDate = new Date(card.createdAt).toLocaleDateString('ja-JP');
        const completedDate = card.completedAt ? 
            new Date(card.completedAt).toLocaleDateString('ja-JP') : '';
        const updatedDate = card.updatedAt ? 
            new Date(card.updatedAt).toLocaleDateString('ja-JP') : '';
        
        let metaInfo = `作成日: ${createdDate}`;
        if (updatedDate) metaInfo += ` | 更新日: ${updatedDate}`;
        if (completedDate) metaInfo += ` | 習得日: ${completedDate}`;
        
        const isExpanded = this.expandedCards.has(card.id);
        const hasAnswer = card.answer && card.answer.trim() !== '';
        const isFavorite = card.favorite || false;
        
        // 検索ハイライト対応
        const highlightedQuestion = this.searchQuery ? 
            this.highlightText(card.question, this.searchQuery) : 
            this.escapeHtml(card.question);
        const highlightedAnswer = this.searchQuery ? 
            this.highlightText(card.answer || '', this.searchQuery) : 
            this.escapeHtml(card.answer || '');
        
        // フラッシュカードモードの場合
        if (this.flashcardSettings.enabled) {
            return `
                <li class="card-item ${card.completed ? 'completed' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${card.id}">
                    <div class="card-checkbox ${card.completed ? 'checked' : ''}" 
                         onclick="flashcardApp.toggleCard(${card.id})"></div>
                    <div class="card-content">
                        <div class="card-question">
                            ${highlightedQuestion}
                            ${hasAnswer ? `<span class="card-indicator ${isExpanded ? 'expanded' : ''}">▶</span>` : ''}
                        </div>
                        ${hasAnswer ? `
                            <div class="card-answer ${isExpanded ? 'expanded' : ''}">
                                ${highlightedAnswer}
                            </div>
                        ` : `
                            <div class="card-answer no-answer ${isExpanded ? 'expanded' : ''}">
                                答えがありません
                            </div>
                        `}
                        <div class="card-meta">${metaInfo}</div>
                    </div>
                    <div class="card-actions">
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="event.stopPropagation(); flashcardApp.toggleFavorite(${card.id})" 
                                title="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
                            ★
                        </button>
                        <button class="edit-btn" onclick="event.stopPropagation(); flashcardApp.editCard(${card.id})" 
                                ${card.completed ? 'disabled' : ''}>編集</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); flashcardApp.deleteCard(${card.id})">削除</button>
                    </div>
                </li>
            `;
        }
        
        // 通常モードの場合
        return `
            <li class="card-item ${card.completed ? 'completed' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${card.id}">
                <div class="card-checkbox ${card.completed ? 'checked' : ''}" 
                     onclick="flashcardApp.toggleCard(${card.id})"></div>
                <div class="card-content">
                    <div class="card-question">${highlightedQuestion}</div>
                    ${hasAnswer ? `<div class="card-answer always-visible">${highlightedAnswer}</div>` : ''}
                    <div class="card-meta">${metaInfo}</div>
                </div>
                <div class="card-actions">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="flashcardApp.toggleFavorite(${card.id})" 
                            title="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
                        ★
                    </button>
                    <button class="edit-btn" onclick="flashcardApp.editCard(${card.id})" 
                            ${card.completed ? 'disabled' : ''}>編集</button>
                    <button class="delete-btn" onclick="flashcardApp.deleteCard(${card.id})">削除</button>
                </div>
            </li>
        `;
    }
    
    // 編集中のカードアイテムをレンダリング
    renderEditingCard(card) {
        const isFavorite = card.favorite || false;
        
        return `
            <li class="card-item ${isFavorite ? 'favorite' : ''}" data-id="${card.id}">
                <div class="card-checkbox ${card.completed ? 'checked' : ''}" 
                     onclick="flashcardApp.toggleCard(${card.id})"></div>
                <div class="edit-form">
                    <input type="text" class="edit-question-input" value="${this.escapeHtml(card.question)}" 
                           maxlength="50" placeholder="質問" 
                           onkeypress="if(event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">
                    <textarea class="edit-answer-input" maxlength="200" placeholder="答え（任意）" 
                              onkeydown="if(event.ctrlKey && event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">${this.escapeHtml(card.answer || '')}</textarea>
                </div>
                <div class="card-actions">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="flashcardApp.toggleFavorite(${card.id})" 
                            title="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
                        ★
                    </button>
                    <button class="save-btn" onclick="flashcardApp.saveCard(${card.id})">保存</button>
                    <button class="cancel-btn" onclick="flashcardApp.cancelEdit()">キャンセル</button>
                </div>
            </li>
        `;
    }
    
    // 統計情報を更新
    updateStats() {
        const totalCount = this.cards.length;
        const activeCount = this.cards.filter(card => !card.completed).length;
        const completedCount = totalCount - activeCount;
        
        const cardCount = document.getElementById('cardCount');
        const clearCompleted = document.getElementById('clearCompleted');
        
        cardCount.textContent = `${totalCount}枚のカード (学習中: ${activeCount}, 習得済み: ${completedCount})`;
        
        // 習得済みカードがない場合はボタンを無効化
        clearCompleted.disabled = completedCount === 0;
        clearCompleted.style.opacity = completedCount === 0 ? '0.5' : '1';
        
        // 一括表示コントロールの表示/非表示
        this.updateBulkControl();
    }
    
    // 一括表示コントロールを更新
    updateBulkControl() {
        const bulkControl = document.getElementById('bulkControl');
        const expandAllBtn = document.getElementById('expandAllBtn');
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        const expandedCount = document.getElementById('expandedCount');
        
        // フラッシュカードモードでカードがある場合のみ表示
        if (this.flashcardSettings.enabled && this.cards.length > 0) {
            bulkControl.classList.add('show');
            
            // 答えがあるカードの数
            const cardsWithAnswers = this.cards.filter(card => card.answer && card.answer.trim() !== '');
            const expandedCardsCount = this.expandedCards.size;
            
            // ボタンの有効/無効状態
            expandAllBtn.disabled = expandedCardsCount >= cardsWithAnswers.length;
            collapseAllBtn.disabled = expandedCardsCount === 0;
            
            // 展開中のカード数を表示
            expandedCount.textContent = `${expandedCardsCount}枚展開中`;
        } else {
            bulkControl.classList.remove('show');
        }
    }
    
    // すべてのカードを展開
    expandAllCards() {
        this.cards.forEach(card => {
            if (card.answer && card.answer.trim() !== '') {
                this.expandedCards.add(card.id);
            }
        });
        this.render();
        this.updateBulkControl();
        this.showNotification('すべてのカードを展開しました', 'success');
    }
    
    // すべてのカードを閉じる
    collapseAllCards() {
        this.expandedCards.clear();
        this.render();
        this.updateBulkControl();
        this.showNotification('すべてのカードを閉じました', 'success');
    }
    
    // 検索を実行
    performSearch(query = null) {
        const searchInput = document.getElementById('searchInput');
        const searchInfo = document.getElementById('searchInfo');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const searchResults = document.getElementById('searchResults');
        
        if (query === null) {
            query = searchInput.value.trim();
        }
        
        this.searchQuery = query;
        
        if (query === '') {
            this.clearSearch();
            return;
        }
        
        // 検索結果を取得
        const results = this.getSearchResults(query);
        
        // UI更新
        searchInfo.style.display = 'block';
        clearSearchBtn.style.display = 'block';
        searchResults.textContent = `"${query}" で ${results.length}件見つかりました`;
        
        // カードリストを再レンダリング
        this.render();
        
        this.showNotification(`${results.length}件のカードが見つかりました`, 'info');
    }
    
    // 検索をクリア
    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchInfo = document.getElementById('searchInfo');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        
        this.searchQuery = '';
        searchInput.value = '';
        searchInfo.style.display = 'none';
        clearSearchBtn.style.display = 'none';
        
        // カードリストを再レンダリング
        this.render();
        
        this.showNotification('検索をクリアしました', 'info');
    }
    
    // 検索結果を取得
    getSearchResults(query) {
        if (!query) return this.cards;
        
        const searchTerm = query.toLowerCase();
        return this.cards.filter(card => {
            const questionMatch = card.question.toLowerCase().includes(searchTerm);
            const answerMatch = card.answer && card.answer.toLowerCase().includes(searchTerm);
            return questionMatch || answerMatch;
        });
    }
    
    // テキストをハイライト
    highlightText(text, query) {
        if (!query || !text) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 通知を表示
    showNotification(message, type = 'info') {
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
    
    // 次の復習日をスケジュール
    scheduleNextReview(card) {
        if (card.reviewCount >= this.forgettingSettings.intervals.length) {
            // 最大復習回数に達した場合は復習を終了
            card.nextReviewDate = null;
            return;
        }
        
        const intervalDays = this.forgettingSettings.intervals[card.reviewCount];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
        
        card.nextReviewDate = nextReviewDate.toISOString();
        card.reviewCount++;
    }
    
    // 忘却曲線をチェックして復習が必要なカードを学習中に戻す
    checkForgettingCurve() {
        if (!this.forgettingSettings.enabled) return;
        
        const now = new Date();
        let reviewedCount = 0;
        
        this.cards.forEach(card => {
            if (card.completed && card.nextReviewDate) {
                const reviewDate = new Date(card.nextReviewDate);
                if (now >= reviewDate) {
                    card.completed = false;
                    card.completedAt = null;
                    
                    // 次の復習日をスケジュール
                    this.scheduleNextReview(card);
                    reviewedCount++;
                }
            }
        });
        
        if (reviewedCount > 0) {
            this.saveCards();
            this.render();
            this.updateStats();
            this.updateForgettingStatus();
            
            if (this.forgettingSettings.notifications) {
                this.showNotification(
                    `${reviewedCount}枚のカードが復習のため学習中に戻りました`,
                    'info'
                );
            }
        }
    }
    
    // 忘却曲線ステータスを更新
    updateForgettingStatus() {
        const forgettingStatus = document.getElementById('forgettingStatus');
        const reviewSchedule = document.getElementById('reviewSchedule');
        
        if (!this.forgettingSettings.enabled) {
            forgettingStatus.classList.remove('show');
            return;
        }
        
        const reviewCards = this.cards.filter(card => 
            card.completed && card.nextReviewDate
        ).sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
        
        if (reviewCards.length === 0) {
            forgettingStatus.classList.remove('show');
            return;
        }
        
        forgettingStatus.classList.add('show');
        reviewSchedule.innerHTML = reviewCards.slice(0, 5).map(card => {
            const reviewDate = new Date(card.nextReviewDate);
            const now = new Date();
            const diffTime = reviewDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let timeText;
            if (diffDays < 0) {
                timeText = '復習予定';
            } else if (diffDays === 0) {
                timeText = '今日';
            } else if (diffDays === 1) {
                timeText = '明日';
            } else {
                timeText = `${diffDays}日後`;
            }
            
            return `
                <div class="review-item">
                    <div>
                        <div class="task-title">${this.escapeHtml(card.question)}</div>
                        <div class="review-info">${card.reviewCount}回目の復習</div>
                    </div>
                    <div class="review-badge">${timeText}</div>
                </div>
            `;
        }).join('');
        
        if (reviewCards.length > 5) {
            reviewSchedule.innerHTML += `
                <div class="review-item" style="opacity: 0.7;">
                    <div class="task-title">他 ${reviewCards.length - 5}枚のカード...</div>
                </div>
            `;
        }
    }
    
    // 設定を読み込み
    loadSettings() {
        const forgettingSettings = this.forgettingSettings;
        const flashcardSettings = this.flashcardSettings;
        
        document.getElementById('enableForgetting').checked = forgettingSettings.enabled;
        document.getElementById('enableNotifications').checked = forgettingSettings.notifications;
        document.getElementById('enableFlashcard').checked = flashcardSettings.enabled;
        
        forgettingSettings.intervals.forEach((interval, index) => {
            const input = document.getElementById(`interval${index + 1}`);
            if (input) input.value = interval;
        });
        
        this.toggleForgettingSettings();
    }
    
    // 忘却曲線設定の表示/非表示を切り替え
    toggleForgettingSettings() {
        const enabled = document.getElementById('enableForgetting').checked;
        const settingsDiv = document.getElementById('forgettingSettings');
        
        if (enabled) {
            settingsDiv.style.display = 'block';
        } else {
            settingsDiv.style.display = 'none';
        }
    }
    
    // フラッシュカード設定を保存
    saveFlashcardSettings() {
        localStorage.setItem('flashcardSettings', JSON.stringify(this.flashcardSettings));
    }
    
    // 忘却曲線設定を保存
    saveForgettingSettings() {
        localStorage.setItem('forgettingSettings', JSON.stringify(this.forgettingSettings));
    }
}

// グローバル関数（HTMLから呼び出すため）
function addCard() {
    flashcardApp.addCard();
}

function filterCards(filter) {
    flashcardApp.filterCards(filter);
}

function filterFavorites() {
    flashcardApp.filterFavorites();
}

function clearCompleted() {
    flashcardApp.clearCompleted();
}

// 一括表示関数
function expandAllCards() {
    flashcardApp.expandAllCards();
}

function collapseAllCards() {
    flashcardApp.collapseAllCards();
}

// 検索関数
function performSearch() {
    flashcardApp.performSearch();
}

function clearSearch() {
    flashcardApp.clearSearch();
}

// 設定モーダル関連の関数
function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('show');
    flashcardApp.loadSettings();
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
}

function toggleForgettingCurve() {
    flashcardApp.toggleForgettingSettings();
}

function toggleFlashcardMode() {
    // フラッシュカードモードの切り替え時に展開状態をリセット
    flashcardApp.expandedCards.clear();
    flashcardApp.render();
    flashcardApp.updateBulkControl();
}

function saveSettings() {
    const forgettingSettings = flashcardApp.forgettingSettings;
    const flashcardSettings = flashcardApp.flashcardSettings;
    
    forgettingSettings.enabled = document.getElementById('enableForgetting').checked;
    forgettingSettings.notifications = document.getElementById('enableNotifications').checked;
    flashcardSettings.enabled = document.getElementById('enableFlashcard').checked;
    
    // 間隔設定を保存
    for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`interval${i + 1}`);
        if (input) {
            forgettingSettings.intervals[i] = parseInt(input.value) || forgettingSettings.intervals[i];
        }
    }
    
    flashcardApp.saveForgettingSettings();
    flashcardApp.saveFlashcardSettings();
    flashcardApp.updateForgettingStatus();
    flashcardApp.render(); // フラッシュカードモードの変更を反映
    closeSettings();
    flashcardApp.showNotification('設定を保存しました', 'success');
}

function resetSettings() {
    if (confirm('設定をデフォルトに戻しますか？')) {
        flashcardApp.forgettingSettings = {
            enabled: false,
            intervals: [1, 3, 7, 14, 30],
            notifications: true
        };
        flashcardApp.flashcardSettings = {
            enabled: true
        };
        flashcardApp.expandedCards.clear();
        flashcardApp.loadSettings();
        flashcardApp.render();
        flashcardApp.showNotification('設定をリセットしました', 'info');
    }
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter で新しいカードを追加
    if (e.ctrlKey && e.key === 'Enter') {
        const questionInput = document.getElementById('cardQuestion');
        const answerInput = document.getElementById('cardAnswer');
        if (document.activeElement !== questionInput && document.activeElement !== answerInput) {
            questionInput.focus();
        }
    }
    
    // Escape で編集をキャンセル
    if (e.key === 'Escape' && flashcardApp && flashcardApp.editingId !== null) {
        flashcardApp.cancelEdit();
    }
});

// アプリケーションを初期化
let flashcardApp;
document.addEventListener('DOMContentLoaded', () => {
    flashcardApp = new FlashcardApp();
    
    // モーダル外クリックで閉じる
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('settingsModal');
        if (e.target === modal) {
            closeSettings();
        }
    });
});
