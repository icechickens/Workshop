// 暗記カードアプリのメイン機能
class FlashcardApp {
    constructor() {
        this.cards = JSON.parse(localStorage.getItem('flashcards')) || [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.searchQuery = '';
        this.selectedTags = [];
        this.allTags = this.getAllTags();
        
        // ソート設定
        this.sortSettings = JSON.parse(localStorage.getItem('sortSettings')) || {
            field: 'createdAt', // デフォルトは登録日時順
            direction: 'desc'   // デフォルトは降順（新しい順）
        };
        
        // 既存のカードにdisplayIdがない場合は設定する
        let nextId = 1;
        this.cards.forEach(card => {
            if (!card.displayId || card.displayId === 0) {
                card.displayId = nextId++;
            }
        });
        
        // 最大のdisplayIdを取得
        this.maxDisplayId = this.cards.reduce((max, card) => {
            return card.displayId > max ? card.displayId : max;
        }, 0);
        
        // 忘却曲線設定のデフォルト値
        this.forgettingSettings = JSON.parse(localStorage.getItem('forgettingSettings')) || {
            enabled: false,
            reviewCount: 5, // 復習回数のデフォルト値
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
        this.updateSortButtons();
        
        // 定期的に忘却曲線をチェック（1分ごと）
        setInterval(() => {
            this.checkForgettingCurve();
        }, 60000);
    }
    
    // ソートボタンの状態を更新
    updateSortButtons() {
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            const field = btn.dataset.field;
            
            // アクティブなソートボタンを強調表示
            if (field === this.sortSettings.field) {
                btn.classList.add('active');
                
                // 方向表示を更新
                const directionIndicator = btn.querySelector('.sort-direction');
                if (directionIndicator) {
                    directionIndicator.textContent = this.sortSettings.direction === 'asc' ? '▲' : '▼';
                }
            } else {
                btn.classList.remove('active');
            }
        });
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
        const tagsInput = document.getElementById('cardTags');
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();
        const tagsText = tagsInput.value.trim();
        
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
        
        // タグを処理
        const tags = tagsText ? this.processTags(tagsText) : [];
        
        // 次のdisplayIdを設定（1から始まる連番）
        this.maxDisplayId++;
        
        const card = {
            id: Date.now(),
            displayId: this.maxDisplayId, // ユーザー向けの連番ID
            question: question,
            answer: answer,
            tags: tags,
            completed: false,
            favorite: false, // お気に入りフラグを追加
            createdAt: new Date().toISOString(),
            // 忘却曲線関連データ
            reviewCount: 0,
            nextReviewDate: null,
            lastCompletedAt: null,
            // 関連カード
            relatedCards: []
        };
        
        this.cards.unshift(card);
        this.saveCards();
        this.updateAllTags();
        this.render();
        this.updateStats();
        
        questionInput.value = '';
        answerInput.value = '';
        tagsInput.value = '';
        questionInput.style.borderColor = '#e0e0e0';
        answerInput.style.borderColor = '#e0e0e0';
        tagsInput.style.borderColor = '#e0e0e0';
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
    
    // タグを処理する（カンマ区切りのタグを配列に変換）
    processTags(tagsText) {
        return tagsText.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '')
            .map(tag => tag.toLowerCase());
    }
    
    // すべてのタグを取得
    getAllTags() {
        const tagsSet = new Set();
        this.cards.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
                card.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet).sort();
    }
    
    // タグリストを更新
    updateAllTags() {
        this.allTags = this.getAllTags();
    }
    
    // タグでフィルタリング
    filterByTags(cards) {
        if (!this.selectedTags.length) return cards;
        
        return cards.filter(card => {
            if (!card.tags || !Array.isArray(card.tags)) return false;
            
            // すべての選択されたタグを含むカードのみを返す
            return this.selectedTags.every(tag => card.tags.includes(tag));
        });
    }
    
    // カードの編集を保存
    saveCard(id) {
        const editQuestionInput = document.querySelector('.edit-question-input');
        const editAnswerInput = document.querySelector('.edit-answer-input');
        const editTagsInput = document.querySelector('.edit-tags-input');
        const newQuestion = editQuestionInput.value.trim();
        const newAnswer = editAnswerInput.value.trim();
        const newTagsText = editTagsInput.value.trim();
        
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
        
        // タグを処理
        const newTags = newTagsText ? this.processTags(newTagsText) : [];
        
        const card = this.cards.find(card => card.id === id);
        if (card) {
            card.question = newQuestion;
            card.answer = newAnswer;
            card.tags = newTags;
            card.updatedAt = new Date().toISOString();
            this.editingId = null;
            this.saveCards();
            this.updateAllTags();
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
        
        // タグフィルター
        filteredCards = this.filterByTags(filteredCards);
        
        // 状態フィルター
        switch (this.currentFilter) {
            case 'active':
                filteredCards = filteredCards.filter(card => !card.completed);
                break;
            case 'completed':
                filteredCards = filteredCards.filter(card => card.completed);
                break;
            case 'favorites':
                filteredCards = filteredCards.filter(card => card.favorite);
                break;
        }
        
        // ソート
        filteredCards = this.sortCards(filteredCards);
        
        return filteredCards;
    }
    
    // カードをソート
    sortCards(cards) {
        const { field, direction } = this.sortSettings;
        
        return [...cards].sort((a, b) => {
            let valueA, valueB;
            
            // ソートフィールドに基づいて値を取得
            switch (field) {
                case 'createdAt':
                    valueA = new Date(a.createdAt).getTime();
                    valueB = new Date(b.createdAt).getTime();
                    break;
                case 'updatedAt':
                    // updatedAtがない場合はcreatedAtを使用
                    valueA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
                    valueB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
                    break;
                default:
                    valueA = new Date(a.createdAt).getTime();
                    valueB = new Date(b.createdAt).getTime();
            }
            
            // ソート方向に基づいて比較
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        });
    }
    
    // ソート設定を変更
    changeSortOrder(field) {
        // 同じフィールドがクリックされた場合は方向を切り替え
        if (field === this.sortSettings.field) {
            this.sortSettings.direction = this.sortSettings.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // 新しいフィールドの場合はそのフィールドで降順（新しい順）に設定
            this.sortSettings.field = field;
            this.sortSettings.direction = 'desc';
        }
        
        // ソート設定を保存
        localStorage.setItem('sortSettings', JSON.stringify(this.sortSettings));
        
        // カードリストを再レンダリング
        this.render();
        
        // 通知を表示
        const fieldName = field === 'createdAt' ? '登録日時' : '更新日時';
        const directionName = this.sortSettings.direction === 'asc' ? '古い順' : '新しい順';
        this.showNotification(`${fieldName}の${directionName}でソートしました`, 'info');
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
            
        // タグを表示
        const tagsHtml = this.renderCardTags(card);
        
        // 関連カードを表示
        const relatedCardsHtml = this.renderRelatedCards(card);
        
        // カードIDを表示用にフォーマット（displayIdを使用）
        const displayId = card.displayId || 0; // 既存のカードにdisplayIdがない場合は0を表示
        
        // 検索クエリがあり、IDが検索クエリに一致する場合はハイライト表示
        let cardIdDisplay;
        if (this.searchQuery && (
            displayId.toString().includes(this.searchQuery.toLowerCase()) || 
            card.id.toString().includes(this.searchQuery.toLowerCase())
        )) {
            cardIdDisplay = `<span class="card-id search-highlight-id">${displayId}</span>`;
        } else {
            cardIdDisplay = `<span class="card-id">${displayId}</span>`;
        }
        
        // フラッシュカードモードの場合
        if (this.flashcardSettings.enabled) {
            return `
                <li class="card-item ${card.completed ? 'completed' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${card.id}">
                    <div class="card-checkbox ${card.completed ? 'checked' : ''}" 
                         onclick="flashcardApp.toggleCard(${card.id})"></div>
                    <div class="card-content">
                        <div class="card-question">
                            ${cardIdDisplay}
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
                        ${tagsHtml}
                        ${relatedCardsHtml}
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
                    <div class="card-question">${cardIdDisplay} ${highlightedQuestion}</div>
                    ${hasAnswer ? `<div class="card-answer always-visible">${highlightedAnswer}</div>` : ''}
                    ${tagsHtml}
                    ${relatedCardsHtml}
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
        const tagsValue = card.tags && Array.isArray(card.tags) ? card.tags.join(', ') : '';
        
        // 関連カードの数を取得
        const relatedCardsCount = card.relatedCards && Array.isArray(card.relatedCards) ? card.relatedCards.length : 0;
        
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
                    <input type="text" class="edit-tags-input" value="${this.escapeHtml(tagsValue)}" 
                           maxlength="100" placeholder="タグ（カンマ区切り）" 
                           onkeypress="if(event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">
                    
                    <button type="button" class="manage-related-btn" onclick="openRelatedCardsModal(${card.id})">
                        🔗 関連カードを管理 ${relatedCardsCount > 0 ? `(${relatedCardsCount})` : ''}
                    </button>
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
        
        // ソートボタンの状態を更新
        this.updateSortButtons();
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
        
        // #で始まる場合はカードIDの完全一致検索
        if (query.startsWith('#')) {
            const idQuery = query.substring(1); // #を除去
            if (!idQuery) return []; // #のみの場合は空の結果を返す
            
            // displayIdの完全一致検索
            const matchedCard = this.cards.find(card => 
                card.displayId && card.displayId.toString() === idQuery
            );
            
            return matchedCard ? [matchedCard] : [];
        }
        
        // 通常の検索（#で始まらない場合）
        const searchTerm = query.toLowerCase();
        return this.cards.filter(card => {
            const questionMatch = card.question.toLowerCase().includes(searchTerm);
            const answerMatch = card.answer && card.answer.toLowerCase().includes(searchTerm);
            
            // タグも検索対象に含める
            const tagMatch = card.tags && Array.isArray(card.tags) && 
                card.tags.some(tag => tag.toLowerCase().includes(searchTerm));
                
            return questionMatch || answerMatch || tagMatch;
        });
    }
    
    // カードのタグをレンダリング
    renderCardTags(card) {
        if (!card.tags || !Array.isArray(card.tags) || card.tags.length === 0) {
            return '';
        }
        
        const tagsHtml = card.tags.map(tag => {
            const isActive = this.selectedTags.includes(tag);
            return `
                <span class="card-tag ${isActive ? 'active' : ''}" 
                      onclick="event.stopPropagation(); flashcardApp.toggleTagFilter('${tag}')">
                    🏷️ ${this.escapeHtml(tag)}
                </span>
            `;
        }).join('');
        
        return `<div class="card-tags">${tagsHtml}</div>`;
    }
    
    // タグフィルターを切り替え
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
            this.showNotification(`タグ「${this.selectedTags.join('、')}」でフィルター中`, 'info');
        } else {
            this.showNotification('タグフィルターをクリアしました', 'info');
        }
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
        if (card.reviewCount >= this.forgettingSettings.reviewCount) {
            // 設定された復習回数に達した場合は復習を終了
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
        
        // 復習回数の設定を読み込み
        document.getElementById('reviewCount').value = forgettingSettings.reviewCount;
        
        // 復習間隔の入力フィールドを生成
        this.generateIntervalInputs();
        
        // 復習間隔の値を設定
        forgettingSettings.intervals.forEach((interval, index) => {
            const input = document.getElementById(`interval${index + 1}`);
            if (input) input.value = interval;
        });
        
        this.toggleForgettingSettings();
    }
    
    // 復習回数に基づいて間隔入力フィールドを動的に生成
    generateIntervalInputs() {
        const container = document.getElementById('intervalSettingsContainer');
        const reviewCount = parseInt(document.getElementById('reviewCount').value) || this.forgettingSettings.reviewCount;
        
        // コンテナをクリア
        container.innerHTML = '';
        
        // 指定された回数分の入力フィールドを生成
        for (let i = 0; i < reviewCount; i++) {
            const intervalItem = document.createElement('div');
            intervalItem.className = 'interval-item';
            
            const label = document.createElement('label');
            label.textContent = `${i + 1}回目の復習:`;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `interval${i + 1}`;
            input.min = '1';
            
            // 回数に応じて最大値を調整
            if (i < 2) input.max = '30'; // 1-2回目は最大30日
            else if (i < 4) input.max = '60'; // 3-4回目は最大60日
            else if (i < 6) input.max = '90'; // 5-6回目は最大90日
            else input.max = '180'; // 7回目以降は最大180日
            
            // デフォルト値を設定
            if (i < this.forgettingSettings.intervals.length) {
                input.value = this.forgettingSettings.intervals[i];
            } else {
                // 既存の間隔がない場合は、前回の間隔の2倍を設定（最低7日）
                const prevInterval = i > 0 ? parseInt(this.forgettingSettings.intervals[i - 1]) || 7 : 7;
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
    
    // 関連カードを表示
    renderRelatedCards(card) {
        if (!card.relatedCards || !Array.isArray(card.relatedCards) || card.relatedCards.length === 0) {
            return '';
        }
        
        // 関連カードの情報を取得
        const relatedCardsInfo = card.relatedCards.map(relatedId => {
            const relatedCard = this.cards.find(c => c.id === relatedId);
            if (!relatedCard) return null;
            
            return {
                id: relatedCard.id,
                question: relatedCard.question
            };
        }).filter(info => info !== null);
        
        if (relatedCardsInfo.length === 0) {
            return '';
        }
        
        // 関連カードのリンクを生成
        const relatedCardsLinks = relatedCardsInfo.map(info => {
            return `
                <span class="related-card-link" onclick="event.stopPropagation(); flashcardApp.scrollToCard(${info.id})">
                    ${this.escapeHtml(info.question)}
                </span>
            `;
        }).join('');
        
        return `
            <div class="related-cards-section">
                <h4>関連カード</h4>
                <div class="related-cards-links">
                    ${relatedCardsLinks}
                </div>
            </div>
        `;
    }
    
    // 特定のカードまでスクロール
    scrollToCard(cardId) {
        const cardElement = document.querySelector(`[data-id="${cardId}"]`);
        if (cardElement) {
            // カードが表示されていない場合はフィルターをリセット
            if (cardElement.offsetParent === null) {
                this.currentFilter = 'all';
                this.selectedTags = [];
                this.searchQuery = '';
                this.render();
                
                // 再レンダリング後に要素を再取得
                setTimeout(() => {
                    const updatedCardElement = document.querySelector(`[data-id="${cardId}"]`);
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

// 復習回数が変更されたときに間隔入力フィールドを更新
function updateIntervalInputs() {
    flashcardApp.generateIntervalInputs();
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
    
    // 復習回数を保存
    const reviewCount = parseInt(document.getElementById('reviewCount').value) || 5;
    forgettingSettings.reviewCount = reviewCount;
    
    // 間隔設定を保存
    const intervals = [];
    for (let i = 0; i < reviewCount; i++) {
        const input = document.getElementById(`interval${i + 1}`);
        if (input) {
            intervals.push(parseInt(input.value) || 1);
        }
    }
    forgettingSettings.intervals = intervals;
    
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
            reviewCount: 5,
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

// タグフィルターモーダル関連の関数
function openTagsFilter() {
    const modal = document.getElementById('tagsFilterModal');
    if (modal) {
        modal.classList.add('show');
        renderTagsFilter();
    } else {
        console.error('タグフィルターモーダルが見つかりません');
    }
}

function closeTagsFilter() {
    const modal = document.getElementById('tagsFilterModal');
    modal.classList.remove('show');
}

function renderTagsFilter() {
    const container = document.getElementById('tagsFilterContainer');
    if (!container || !flashcardApp) return;
    
    const allTags = flashcardApp.allTags;
    
    if (!allTags || allTags.length === 0) {
        container.innerHTML = '<div class="no-tags-message">タグがありません。カードにタグを追加してください。</div>';
        return;
    }
    
    // タグごとのカード数をカウント
    const tagCounts = {};
    flashcardApp.cards.forEach(card => {
        if (card.tags && Array.isArray(card.tags)) {
            card.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    
    // タグフィルターアイテムを生成
    const tagsHtml = allTags.map(tag => {
        const isSelected = flashcardApp.selectedTags.includes(tag);
        const count = tagCounts[tag] || 0;
        
        return `
            <div class="tag-filter-item ${isSelected ? 'selected' : ''}" 
                 onclick="toggleTagSelection('${tag}')">
                ${tag}
                <span class="tag-count">${count}</span>
            </div>
        `;
    }).join('');
    
    // 選択中のタグ表示
    let selectedTagsHtml = '';
    if (flashcardApp.selectedTags.length > 0) {
        selectedTagsHtml = `
            <div class="active-tag-filters">
                <span class="active-tag-filters-label">選択中のタグ:</span>
                ${flashcardApp.selectedTags.map(tag => `
                    <div class="tag-filter-item selected">
                        ${tag}
                        <span onclick="removeTagSelection('${tag}')" style="margin-left: 5px; cursor: pointer;">✕</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = tagsHtml + selectedTagsHtml;
}

function toggleTagSelection(tag) {
    if (!flashcardApp) return;
    
    const index = flashcardApp.selectedTags.indexOf(tag);
    if (index === -1) {
        flashcardApp.selectedTags.push(tag);
    } else {
        flashcardApp.selectedTags.splice(index, 1);
    }
    renderTagsFilter();
}

function removeTagSelection(tag) {
    const index = flashcardApp.selectedTags.indexOf(tag);
    if (index !== -1) {
        flashcardApp.selectedTags.splice(index, 1);
    }
    renderTagsFilter();
}

function applyTagsFilter() {
    flashcardApp.render();
    closeTagsFilter();
    
    if (flashcardApp.selectedTags.length > 0) {
        flashcardApp.showNotification(`タグ「${flashcardApp.selectedTags.join('、')}」でフィルター中`, 'info');
    }
}

function clearTagsFilter() {
    flashcardApp.selectedTags = [];
    renderTagsFilter();
    flashcardApp.render();
    flashcardApp.showNotification('タグフィルターをクリアしました', 'info');
}

// ソート順変更関数
function changeSortOrder(field) {
    flashcardApp.changeSortOrder(field);
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

// 関連カード選択モーダル関連の変数
let currentEditingCardId = null;
let selectedRelatedCards = [];

// 関連カード選択モーダルを開く
function openRelatedCardsModal(cardId) {
    currentEditingCardId = cardId;
    const card = flashcardApp.cards.find(c => c.id === cardId);
    
    if (card && card.relatedCards) {
        selectedRelatedCards = [...card.relatedCards];
    } else {
        selectedRelatedCards = [];
    }
    
    const modal = document.getElementById('relatedCardsModal');
    modal.classList.add('show');
    
    // 関連カード検索フィールドをクリア
    const searchInput = document.getElementById('relatedCardsSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 関連カードリストを表示
    renderRelatedCardsList();
    renderSelectedRelatedCards();
    
    // 検索フィールドにイベントリスナーを追加
    searchInput.addEventListener('input', () => {
        renderRelatedCardsList(searchInput.value.trim());
    });
}

// 関連カード選択モーダルを閉じる
function closeRelatedCardsModal() {
    const modal = document.getElementById('relatedCardsModal');
    modal.classList.remove('show');
    currentEditingCardId = null;
    selectedRelatedCards = [];
}

// 関連カードリストをレンダリング
function renderRelatedCardsList(searchQuery = '') {
    const container = document.getElementById('relatedCardsContainer');
    if (!container || !flashcardApp) return;
    
    // 現在編集中のカードを除外した他のカードを取得
    let availableCards = flashcardApp.cards.filter(card => card.id !== currentEditingCardId);
    
    // 検索クエリがある場合はフィルタリング
    if (searchQuery) {
        // #で始まる場合はカードIDの完全一致検索
        if (searchQuery.startsWith('#')) {
            const idQuery = searchQuery.substring(1); // #を除去
            if (idQuery) { // #のみの場合は何もしない
                availableCards = availableCards.filter(card => 
                    card.displayId && card.displayId.toString() === idQuery
                );
            }
        } else {
            // 通常の検索（#で始まらない場合）
            const query = searchQuery.toLowerCase();
            availableCards = availableCards.filter(card => 
                card.question.toLowerCase().includes(query) || 
                (card.answer && card.answer.toLowerCase().includes(query))
            );
        }
    }
    
    if (availableCards.length === 0) {
        container.innerHTML = '<div class="no-related-cards">関連付け可能なカードがありません</div>';
        return;
    }
    
    // カードリストを生成
    const cardsHtml = availableCards.map(card => {
        const isSelected = selectedRelatedCards.includes(card.id);
        const displayId = card.displayId || 0; // 既存のカードにdisplayIdがない場合は0を表示
        return `
            <div class="related-card-item ${isSelected ? 'selected' : ''}" data-id="${card.id}">
                <div class="related-card-question">
                    <span class="card-id">${displayId}</span>
                    ${flashcardApp.escapeHtml(card.question)}
                </div>
                <button class="related-card-select" onclick="toggleRelatedCard(${card.id})">
                    ${isSelected ? '選択解除' : '選択'}
                </button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = cardsHtml;
}

// 選択された関連カードを表示
function renderSelectedRelatedCards() {
    const container = document.getElementById('selectedCardsList');
    if (!container || !flashcardApp) return;
    
    if (selectedRelatedCards.length === 0) {
        container.innerHTML = '<div class="no-related-cards">選択されたカードはありません</div>';
        return;
    }
    
    // 選択されたカードのバッジを生成
    const selectedCardsHtml = selectedRelatedCards.map(cardId => {
        const card = flashcardApp.cards.find(c => c.id === cardId);
        if (!card) return '';
        
        return `
            <div class="selected-card-badge">
                ${flashcardApp.escapeHtml(card.question)}
                <span class="remove-related" onclick="toggleRelatedCard(${cardId})">✕</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = selectedCardsHtml;
}

// 関連カードの選択/解除を切り替え
function toggleRelatedCard(cardId) {
    const index = selectedRelatedCards.indexOf(cardId);
    if (index === -1) {
        selectedRelatedCards.push(cardId);
    } else {
        selectedRelatedCards.splice(index, 1);
    }
    
    renderRelatedCardsList(document.getElementById('relatedCardsSearch').value.trim());
    renderSelectedRelatedCards();
}

// 関連カードをクリア
function clearRelatedCards() {
    selectedRelatedCards = [];
    renderRelatedCardsList(document.getElementById('relatedCardsSearch').value.trim());
    renderSelectedRelatedCards();
}

// 関連カードを適用（双方向）
function applyRelatedCards() {
    if (currentEditingCardId === null) return;
    
    const card = flashcardApp.cards.find(c => c.id === currentEditingCardId);
    if (!card) return;
    
    // 以前の関連カードから現在のカードへの参照を削除
    if (card.relatedCards && Array.isArray(card.relatedCards)) {
        card.relatedCards.forEach(oldRelatedId => {
            const oldRelatedCard = flashcardApp.cards.find(c => c.id === oldRelatedId);
            if (oldRelatedCard && oldRelatedCard.relatedCards) {
                // 古い関連カードから現在のカードへの参照を削除
                oldRelatedCard.relatedCards = oldRelatedCard.relatedCards.filter(id => id !== currentEditingCardId);
            }
        });
    }
    
    // 現在のカードに新しい関連カードを設定
    card.relatedCards = [...selectedRelatedCards];
    
    // 選択された関連カードにも現在のカードを関連付け（双方向）
    selectedRelatedCards.forEach(relatedId => {
        const relatedCard = flashcardApp.cards.find(c => c.id === relatedId);
        if (relatedCard) {
            // 関連カードがまだ初期化されていない場合は初期化
            if (!relatedCard.relatedCards) {
                relatedCard.relatedCards = [];
            }
            
            // 重複を避けるために既に関連付けされているか確認
            if (!relatedCard.relatedCards.includes(currentEditingCardId)) {
                relatedCard.relatedCards.push(currentEditingCardId);
            }
        }
    });
    
    flashcardApp.saveCards();
    flashcardApp.render();
    closeRelatedCardsModal();
    flashcardApp.showNotification(`${selectedRelatedCards.length}枚のカードを双方向に関連付けました`, 'success');
}

// アプリケーションを初期化
let flashcardApp;
document.addEventListener('DOMContentLoaded', () => {
    flashcardApp = new FlashcardApp();
    
    // モーダル外クリックで閉じる
    window.addEventListener('click', (e) => {
        const settingsModal = document.getElementById('settingsModal');
        if (e.target === settingsModal) {
            closeSettings();
        }
        
        const tagsFilterModal = document.getElementById('tagsFilterModal');
        if (e.target === tagsFilterModal) {
            closeTagsFilter();
        }
        
        const relatedCardsModal = document.getElementById('relatedCardsModal');
        if (e.target === relatedCardsModal) {
            closeRelatedCardsModal();
        }
    });
});
