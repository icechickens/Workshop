import { escapeHtml, highlightText, formatDate } from '../utils.js';
import { CONFIG } from '../config.js';

/**
 * UIコンポーネントクラス
 */
export class UIComponents {
    /**
     * カードアイテムをレンダリング
     * @param {Card} card - カード
     * @param {Object} options - レンダリングオプション
     * @returns {string} HTML文字列
     */
    static renderCard(card, options = {}) {
        const {
            isEditing = false,
            isExpanded = false,
            searchQuery = '',
            flashcardMode = true,
            relatedCards = []
        } = options;

        if (isEditing) {
            return UIComponents.renderEditingCard(card, relatedCards);
        }

        const createdDate = formatDate(card.createdAt);
        const completedDate = card.completedAt ? formatDate(card.completedAt) : '';
        const updatedDate = card.updatedAt ? formatDate(card.updatedAt) : '';

        let metaInfo = `作成日: ${createdDate}`;
        if (updatedDate) metaInfo += ` | 更新日: ${updatedDate}`;
        if (completedDate) metaInfo += ` | 習得日: ${completedDate}`;
        if (card.reviewCount > 0) metaInfo += ` | 学習回数: ${card.reviewCount}回目`;

        const hasAnswer = card.answer && card.answer.trim() !== '';
        const isFavorite = card.favorite || false;

        // 検索ハイライト対応
        const highlightedQuestion = searchQuery ? 
            highlightText(card.question, searchQuery) : 
            escapeHtml(card.question);
        const highlightedAnswer = searchQuery ? 
            highlightText(card.answer || '', searchQuery) : 
            escapeHtml(card.answer || '');

        // タグを表示
        const tagsHtml = UIComponents.renderCardTags(card, searchQuery);

        // 関連カードを表示
        const relatedCardsHtml = UIComponents.renderRelatedCards(card, relatedCards);

        // URLを表示
        const urlsHtml = UIComponents.renderCardUrls(card);

        // 画像を表示
        const imagesHtml = UIComponents.renderCardImages(card);

        // カードIDを表示用にフォーマット
        const displayId = card.displayId || 0;
        let cardIdDisplay;
        if (searchQuery && displayId.toString().includes(searchQuery.toLowerCase())) {
            cardIdDisplay = `<span class="card-id search-highlight-id">${displayId}</span>`;
        } else {
            cardIdDisplay = `<span class="card-id">${displayId}</span>`;
        }

        // フラッシュカードモードの場合
        if (flashcardMode) {
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
                            <div class="card-answer ${isExpanded ? 'expanded' : ''}">${highlightedAnswer}</div>
                        ` : `
                            <div class="card-answer no-answer ${isExpanded ? 'expanded' : ''}">解説がありません</div>
                        `}
                        ${tagsHtml}
                        ${urlsHtml}
                        ${imagesHtml}
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
                    ${urlsHtml}
                    ${imagesHtml}
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

    /**
     * 編集中のカードアイテムをレンダリング
     * @param {Card} card - カード
     * @param {Card[]} relatedCards - 関連カードの配列
     * @returns {string} HTML文字列
     */
    static renderEditingCard(card, relatedCards = []) {
        const isFavorite = card.favorite || false;
        const tagsValue = card.tags && Array.isArray(card.tags) ? card.tags.join(', ') : '';
        const relatedCardsCount = card.relatedCards && Array.isArray(card.relatedCards) ? 
            card.relatedCards.length : 0;

        return `
            <li class="card-item ${isFavorite ? 'favorite' : ''}" data-id="${card.id}">
                <div class="card-checkbox ${card.completed ? 'checked' : ''}" 
                     onclick="event.stopPropagation(); flashcardApp.toggleCard(${card.id})"></div>
                <div class="edit-form">
                    <input type="text" class="edit-question-input" value="${escapeHtml(card.question)}" 
                           maxlength="50" placeholder="問題" 
                           onkeypress="if(event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">
                    <textarea class="edit-answer-input" maxlength="200" placeholder="解説（任意）" 
                              onkeydown="if(event.ctrlKey && event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">${escapeHtml(card.answer || '')}</textarea>
                    <input type="text" class="edit-tags-input" value="${escapeHtml(tagsValue)}" 
                           maxlength="100" placeholder="タグ（カンマ区切り）" 
                           onkeypress="if(event.key==='Enter') flashcardApp.saveCard(${card.id}); if(event.key==='Escape') flashcardApp.cancelEdit();">
                    
                    <button type="button" class="manage-related-btn" onclick="event.stopPropagation(); openRelatedCardsModal(${card.id})">
                        🔗 関連カードを管理 ${relatedCardsCount > 0 ? `(${relatedCardsCount})` : ''}
                    </button>
                    
                    <div class="url-management">
                        <label>関連URL (最大${CONFIG.LIMITS.URLS_MAX_COUNT}個):</label>
                        <div class="url-input-container">
                            <input type="url" class="url-input" placeholder="https://example.com" 
                                   onkeypress="if(event.key==='Enter') addUrlToCard(${card.id}, this.value);">
                            <button type="button" class="add-url-btn" onclick="addUrlToCard(${card.id}, this.previousElementSibling.value)">
                                追加
                            </button>
                        </div>
                        <div class="urls-list" id="urls-list-${card.id}">
                            ${UIComponents.renderEditableUrls(card)}
                        </div>
                    </div>
                    
                    <div class="image-management">
                        <label>画像 (最大${CONFIG.LIMITS.IMAGES_MAX_COUNT}個、各5MB以下):</label>
                        <div class="image-input-container">
                            <input type="file" class="image-input" accept="image/*" 
                                   onchange="addImageToCard(${card.id}, this.files[0])">
                        </div>
                        <div class="images-list" id="images-list-${card.id}">
                            ${UIComponents.renderEditableImages(card)}
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="event.stopPropagation(); flashcardApp.toggleFavorite(${card.id})" 
                            title="${isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
                        ★
                    </button>
                    <button class="save-btn" onclick="event.stopPropagation(); flashcardApp.saveCard(${card.id})">保存</button>
                    <button class="cancel-btn" onclick="event.stopPropagation(); flashcardApp.cancelEdit()">キャンセル</button>
                </div>
            </li>
        `;
    }

    /**
     * カードのタグをレンダリング
     * @param {Card} card - カード
     * @param {string} searchQuery - 検索クエリ
     * @returns {string} HTML文字列
     */
    static renderCardTags(card, searchQuery = '') {
        if (!card.tags || !Array.isArray(card.tags) || card.tags.length === 0) {
            return '';
        }

        const tagsHtml = card.tags.map(tag => {
            const tagText = searchQuery ? highlightText(tag, searchQuery) : escapeHtml(tag);
            return `
                <span class="card-tag" 
                      onclick="event.stopPropagation(); flashcardApp.toggleTagFilter('${tag}')">
                    🏷️ ${tagText}
                </span>
            `;
        }).join('');

        return `<div class="card-tags">${tagsHtml}</div>`;
    }

    /**
     * 関連カードをレンダリング
     * @param {Card} card - カード
     * @param {Card[]} relatedCards - 関連カードの配列
     * @returns {string} HTML文字列
     */
    static renderRelatedCards(card, relatedCards = []) {
        if (!card.relatedCards || !Array.isArray(card.relatedCards) || card.relatedCards.length === 0) {
            return '';
        }

        // 関連カードの情報を取得
        const relatedCardsInfo = card.relatedCards.map(relatedId => {
            const relatedCard = relatedCards.find(c => c.id === relatedId);
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
                    ${escapeHtml(info.question)}
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

    /**
     * 空状態をレンダリング
     * @param {string} message - 表示メッセージ
     * @returns {string} HTML文字列
     */
    static renderEmptyState(message) {
        return `
            <div class="empty-state show">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    /**
     * 統計情報をレンダリング
     * @param {Object} stats - 統計情報
     * @returns {string} HTML文字列
     */
    static renderStats(stats) {
        return `${stats.total}枚のカード (学習中: ${stats.active}, 習得済み: ${stats.completed})`;
    }

    /**
     * 復習スケジュールをレンダリング
     * @param {Card[]} reviewCards - 復習予定のカード
     * @returns {string} HTML文字列
     */
    static renderReviewSchedule(reviewCards) {
        if (reviewCards.length === 0) {
            return '';
        }

        const reviewItems = reviewCards.slice(0, 5).map(card => {
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
                        <div class="task-title">${escapeHtml(card.question)}</div>
                        <div class="review-info">${card.reviewCount}回目の復習</div>
                    </div>
                    <div class="review-badge">${timeText}</div>
                </div>
            `;
        }).join('');

        let additionalItems = '';
        if (reviewCards.length > 5) {
            additionalItems = `
                <div class="review-item" style="opacity: 0.7;">
                    <div class="task-title">他 ${reviewCards.length - 5}枚のカード...</div>
                </div>
            `;
        }

        return reviewItems + additionalItems;
    }

    /**
     * タグフィルターをレンダリング
     * @param {string[]} allTags - すべてのタグ
     * @param {string[]} selectedTags - 選択されたタグ
     * @param {Object} tagCounts - タグごとのカード数
     * @returns {string} HTML文字列
     */
    static renderTagsFilter(allTags, selectedTags, tagCounts) {
        if (!allTags || allTags.length === 0) {
            return '<div class="no-tags-message">タグがありません。カードにタグを追加してください。</div>';
        }

        // タグフィルターアイテムを生成
        const tagsHtml = allTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            const count = tagCounts[tag] || 0;

            return `
                <div class="tag-filter-item ${isSelected ? 'selected' : ''}" 
                     onclick="toggleTagSelection('${tag}')">
                    ${escapeHtml(tag)}
                    <span class="tag-count">${count}</span>
                </div>
            `;
        }).join('');

        // 選択中のタグ表示
        let selectedTagsHtml = '';
        if (selectedTags.length > 0) {
            selectedTagsHtml = `
                <div class="active-tag-filters">
                    <span class="active-tag-filters-label">選択中のタグ:</span>
                    ${selectedTags.map(tag => `
                        <div class="tag-filter-item selected">
                            ${escapeHtml(tag)}
                            <span onclick="removeTagSelection('${tag}')" style="margin-left: 5px; cursor: pointer;">✕</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return tagsHtml + selectedTagsHtml;
    }

    /**
     * 関連カードリストをレンダリング
     * @param {Card[]} availableCards - 利用可能なカード
     * @param {number[]} selectedRelatedCards - 選択された関連カードのID
     * @returns {string} HTML文字列
     */
    static renderRelatedCardsList(availableCards, selectedRelatedCards) {
        if (availableCards.length === 0) {
            return '<div class="no-related-cards">関連付け可能なカードがありません</div>';
        }

        const cardsHtml = availableCards.map(card => {
            const isSelected = selectedRelatedCards.includes(card.id);
            const displayId = card.displayId || 0;
            
            return `
                <div class="related-card-item ${isSelected ? 'selected' : ''}" data-id="${card.id}">
                    <div class="related-card-question">
                        <span class="card-id">${displayId}</span>
                        ${escapeHtml(card.question)}
                    </div>
                    <button class="related-card-select" onclick="toggleRelatedCard(${card.id})">
                        ${isSelected ? '選択解除' : '選択'}
                    </button>
                </div>
            `;
        }).join('');

        return cardsHtml;
    }

    /**
     * 選択された関連カードをレンダリング
     * @param {Card[]} selectedCards - 選択されたカード
     * @returns {string} HTML文字列
     */
    static renderSelectedRelatedCards(selectedCards) {
        if (selectedCards.length === 0) {
            return '<div class="no-related-cards">選択されたカードはありません</div>';
        }

        const selectedCardsHtml = selectedCards.map(card => {
            return `
                <div class="selected-card-badge">
                    ${escapeHtml(card.question)}
                    <span class="remove-related" onclick="toggleRelatedCard(${card.id})">✕</span>
                </div>
            `;
        }).join('');

        return selectedCardsHtml;
    }

    /**
     * カードのURLをレンダリング
     * @param {Card} card - カード
     * @returns {string} HTML文字列
     */
    static renderCardUrls(card) {
        if (!card.urls || !Array.isArray(card.urls) || card.urls.length === 0) {
            return '';
        }

        const urlsHtml = card.urls.map(url => {
            const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
            return `
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="card-url">
                    🔗 ${escapeHtml(displayUrl)}
                </a>
            `;
        }).join('');

        return `
            <div class="card-urls">
                <h4>関連URL</h4>
                <div class="urls-container">
                    ${urlsHtml}
                </div>
            </div>
        `;
    }

    /**
     * カードの画像をレンダリング
     * @param {Card} card - カード
     * @returns {string} HTML文字列
     */
    static renderCardImages(card) {
        if (!card.images || !Array.isArray(card.images) || card.images.length === 0) {
            return '';
        }

        const imagesHtml = card.images.map(imageInfo => {
            const imageData = card.getImageData(imageInfo.id);
            if (!imageData) return '';

            return `
                <div class="card-image-container">
                    <img src="${imageData}" alt="${escapeHtml(imageInfo.name)}" 
                         class="card-image" onclick="openImageModal('${imageData}', '${escapeHtml(imageInfo.name)}')">
                    <div class="image-info">
                        <span class="image-name">${escapeHtml(imageInfo.name)}</span>
                        <span class="image-size">${UIComponents.formatFileSize(imageInfo.size)}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="card-images">
                <h4>画像</h4>
                <div class="images-container">
                    ${imagesHtml}
                </div>
            </div>
        `;
    }

    /**
     * 編集可能なURLリストをレンダリング
     * @param {Card} card - カード
     * @returns {string} HTML文字列
     */
    static renderEditableUrls(card) {
        if (!card.urls || !Array.isArray(card.urls) || card.urls.length === 0) {
            return '<div class="no-urls">URLが登録されていません</div>';
        }

        return card.urls.map(url => {
            const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
            return `
                <div class="editable-url-item">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="url-link">
                        🔗 ${escapeHtml(displayUrl)}
                    </a>
                    <button type="button" class="remove-url-btn" 
                            onclick="removeUrlFromCard(${card.id}, '${escapeHtml(url)}')">
                        削除
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * 編集可能な画像リストをレンダリング
     * @param {Card} card - カード
     * @returns {string} HTML文字列
     */
    static renderEditableImages(card) {
        if (!card.images || !Array.isArray(card.images) || card.images.length === 0) {
            return '<div class="no-images">画像が登録されていません</div>';
        }

        return card.images.map(imageInfo => {
            const imageData = card.getImageData(imageInfo.id);
            if (!imageData) return '';

            return `
                <div class="editable-image-item">
                    <img src="${imageData}" alt="${escapeHtml(imageInfo.name)}" class="edit-image-thumbnail">
                    <div class="image-details">
                        <div class="image-name">${escapeHtml(imageInfo.name)}</div>
                        <div class="image-size">${UIComponents.formatFileSize(imageInfo.size)}</div>
                    </div>
                    <button type="button" class="remove-image-btn" 
                            onclick="removeImageFromCard(${card.id}, '${imageInfo.id}')">
                        削除
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * ファイルサイズをフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマットされたサイズ
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
