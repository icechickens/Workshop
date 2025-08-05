/**
 * テスト用ヘルパー関数
 * 各種テストで共通して使用される関数を定義
 */

/**
 * テスト用のアサーション関数
 */
export class TestAssert {
    static assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
        }
        console.log(`✓ ${message || 'Assertion passed'}`);
    }

    static assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}\nExpected: true\nActual: ${condition}`);
        }
        console.log(`✓ ${message || 'Assertion passed'}`);
    }

    static assertFalse(condition, message = '') {
        if (condition) {
            throw new Error(`Assertion failed: ${message}\nExpected: false\nActual: ${condition}`);
        }
        console.log(`✓ ${message || 'Assertion passed'}`);
    }

    static assertArrayEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
        }
        console.log(`✓ ${message || 'Array assertion passed'}`);
    }

    static assertThrows(fn, message = '') {
        try {
            fn();
            throw new Error(`Assertion failed: ${message}\nExpected function to throw, but it didn't`);
        } catch (error) {
            if (error.message.includes('Assertion failed')) {
                throw error;
            }
            console.log(`✓ ${message || 'Exception assertion passed'}`);
        }
    }
}

/**
 * DOM操作のヘルパー関数
 */
export class DOMHelper {
    static createElement(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        if (textContent) {
            element.textContent = textContent;
        }
        return element;
    }

    static createTestContainer(id = 'test-container') {
        const container = this.createElement('div', { id });
        document.body.appendChild(container);
        return container;
    }

    static cleanupTestContainer(id = 'test-container') {
        const container = document.getElementById(id);
        if (container) {
            container.remove();
        }
    }

    static simulateClick(element) {
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
    }

    static simulateInput(element, value) {
        element.value = value;
        const event = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }

    static simulateKeyPress(element, key) {
        const event = new KeyboardEvent('keydown', {
            key: key,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }
}

/**
 * ローカルストレージのモック
 */
export class MockLocalStorage {
    constructor() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }

    key(index) {
        const keys = Object.keys(this.store);
        return keys[index] || null;
    }

    get length() {
        return Object.keys(this.store).length;
    }
}

/**
 * テスト環境のセットアップ
 */
export class TestEnvironment {
    static setup() {
        // ローカルストレージのモック化
        if (typeof window !== 'undefined') {
            window.localStorage = new MockLocalStorage();
        }

        // コンソールログの制御
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
    }

    static teardown() {
        // DOM のクリーンアップ
        DOMHelper.cleanupTestContainer();
        
        // ローカルストレージのクリア
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear();
        }

        // コンソールの復元
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.error = this.originalConsole.error;
            console.warn = this.originalConsole.warn;
        }
    }

    static suppressConsole() {
        console.log = () => {};
        console.error = () => {};
        console.warn = () => {};
    }

    static restoreConsole() {
        if (this.originalConsole) {
            console.log = this.originalConsole.log;
            console.error = this.originalConsole.error;
            console.warn = this.originalConsole.warn;
        }
    }
}

/**
 * テストスイートの実行
 */
export class TestSuite {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.beforeEachFn = null;
        this.afterEachFn = null;
    }

    beforeEach(fn) {
        this.beforeEachFn = fn;
    }

    afterEach(fn) {
        this.afterEachFn = fn;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log(`\n🧪 Running test suite: ${this.name}`);
        console.log('='.repeat(50));

        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            try {
                if (this.beforeEachFn) {
                    await this.beforeEachFn();
                }

                await test.fn();
                console.log(`✅ ${test.name}`);
                passed++;

                if (this.afterEachFn) {
                    await this.afterEachFn();
                }
            } catch (error) {
                console.error(`❌ ${test.name}`);
                console.error(`   Error: ${error.message}`);
                failed++;
            }
        }

        console.log('='.repeat(50));
        console.log(`📊 Results: ${passed} passed, ${failed} failed`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed!');
        }

        return { passed, failed, total: this.tests.length };
    }
}

/**
 * 非同期処理のテストヘルパー
 */
export class AsyncHelper {
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async waitFor(condition, timeout = 5000, interval = 100) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await this.wait(interval);
        }
        
        throw new Error(`Timeout: Condition not met within ${timeout}ms`);
    }

    static async waitForElement(selector, timeout = 5000) {
        return this.waitFor(() => {
            return document.querySelector(selector) !== null;
        }, timeout);
    }
}
