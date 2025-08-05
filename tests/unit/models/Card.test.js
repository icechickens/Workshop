/**
 * Card モデルの単体テスト
 */

import { Card } from '../../../src/js/models/Card.js';
import { TestSuite, TestAssert } from '../../utils/test-helpers.js';
import { MockCardGenerator } from '../../utils/mock-data.js';

const suite = new TestSuite('Card Model Tests');

suite.beforeEach(() => {
    // テスト前の準備
    console.log('Setting up Card test...');
});

suite.afterEach(() => {
    // テスト後のクリーンアップ
    console.log('Cleaning up Card test...');
});

// カードの作成テスト
suite.test('should create a new card with valid data', () => {
    const cardData = {
        question: 'テスト問題',
        answer: 'テスト解答',
        tags: ['テスト']
    };
    
    const card = new Card(cardData);
    
    TestAssert.assertEqual(card.question, 'テスト問題', 'Question should be set correctly');
    TestAssert.assertEqual(card.answer, 'テスト解答', 'Answer should be set correctly');
    TestAssert.assertArrayEqual(card.tags, ['テスト'], 'Tags should be set correctly');
    TestAssert.assertFalse(card.completed, 'Card should not be completed by default');
    TestAssert.assertTrue(card.id > 0, 'Card should have a valid ID');
});

// カードの更新テスト
suite.test('should update card properties correctly', () => {
    const card = new Card({ question: '元の問題', answer: '元の解答' });
    
    card.updateCard({
        question: '更新された問題',
        answer: '更新された解答',
        tags: ['更新', 'テスト']
    });
    
    TestAssert.assertEqual(card.question, '更新された問題', 'Question should be updated');
    TestAssert.assertEqual(card.answer, '更新された解答', 'Answer should be updated');
    TestAssert.assertArrayEqual(card.tags, ['更新', 'テスト'], 'Tags should be updated');
    TestAssert.assertTrue(card.updatedAt !== card.createdAt, 'UpdatedAt should be different from createdAt');
});

// 習得状態の切り替えテスト
suite.test('should toggle completion status correctly', () => {
    const card = new Card({ question: 'テスト問題', answer: 'テスト解答' });
    
    TestAssert.assertFalse(card.completed, 'Card should not be completed initially');
    TestAssert.assertEqual(card.completedAt, null, 'CompletedAt should be null initially');
    
    card.toggleCompletion();
    
    TestAssert.assertTrue(card.completed, 'Card should be completed after toggle');
    TestAssert.assertTrue(card.completedAt !== null, 'CompletedAt should be set after completion');
    TestAssert.assertEqual(card.reviewCount, 1, 'Review count should be incremented');
    
    card.toggleCompletion();
    
    TestAssert.assertFalse(card.completed, 'Card should not be completed after second toggle');
});

// 検索機能のテスト
suite.test('should match search terms correctly', () => {
    const card = new Card({
        question: 'JavaScript配列操作について',
        answer: 'map, filter, reduceメソッドを使用します',
        tags: ['JavaScript', '配列']
    });
    
    TestAssert.assertTrue(card.matchesSearch('JavaScript'), 'Should match question keyword');
    TestAssert.assertTrue(card.matchesSearch('map'), 'Should match answer keyword');
    TestAssert.assertTrue(card.matchesSearch('配列'), 'Should match tag keyword');
    TestAssert.assertTrue(card.matchesSearch('javascript'), 'Should be case insensitive');
    TestAssert.assertFalse(card.matchesSearch('Python'), 'Should not match unrelated keyword');
});

// バリデーションテスト
suite.test('should validate card data correctly', () => {
    TestAssert.assertThrows(() => {
        new Card({ question: '', answer: 'テスト解答' });
    }, 'Should throw error for empty question');
    
    TestAssert.assertThrows(() => {
        new Card({ question: 'a'.repeat(51), answer: 'テスト解答' });
    }, 'Should throw error for question too long');
    
    TestAssert.assertThrows(() => {
        new Card({ question: 'テスト問題', answer: 'a'.repeat(201) });
    }, 'Should throw error for answer too long');
});

// 復習スケジュールのテスト
suite.test('should calculate next review date correctly', () => {
    const card = new Card({ question: 'テスト問題', answer: 'テスト解答' });
    
    // 初回完了
    card.toggleCompletion();
    TestAssert.assertTrue(card.nextReviewDate !== null, 'Next review date should be set after completion');
    
    const firstReviewDate = new Date(card.nextReviewDate);
    const now = new Date();
    TestAssert.assertTrue(firstReviewDate > now, 'Next review date should be in the future');
});

// JSON変換のテスト
suite.test('should convert to JSON correctly', () => {
    const cardData = MockCardGenerator.generateCard(1);
    const card = new Card(cardData);
    
    const json = card.toJSON();
    
    TestAssert.assertEqual(json.id, card.id, 'JSON should contain correct ID');
    TestAssert.assertEqual(json.question, card.question, 'JSON should contain correct question');
    TestAssert.assertEqual(json.answer, card.answer, 'JSON should contain correct answer');
    TestAssert.assertEqual(json.completed, card.completed, 'JSON should contain correct completion status');
});

// テストスイートの実行
if (typeof window !== 'undefined') {
    // ブラウザ環境での実行
    window.addEventListener('DOMContentLoaded', async () => {
        await suite.run();
    });
} else {
    // Node.js環境での実行
    suite.run().catch(console.error);
}

export { suite as CardModelTestSuite };
