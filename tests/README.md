# テストフォルダ構成

このフォルダには暗記カードアプリのテスト関連ファイルを整理して配置しています。

## フォルダ構成

```
tests/
├── unit/                           # 単体テスト
│   ├── models/                     # モデルクラスのテスト
│   ├── services/                   # サービスクラスのテスト
│   ├── components/                 # UIコンポーネントのテスト
│   │   └── favorite-component-test.js  # お気に入り機能コンポーネントテスト
│   └── utils/                      # ユーティリティ関数のテスト
├── integration/                    # 結合テスト
│   ├── card-operations/            # カード操作の結合テスト
│   │   └── favorite-integration-test.js  # お気に入り機能結合テスト
│   ├── search-filter/              # 検索・フィルタリングの結合テスト
│   └── settings/                   # 設定機能の結合テスト
├── e2e/                           # エンドツーエンドテスト
│   ├── user-scenarios/             # ユーザーシナリオテスト
│   └── browser-tests/              # ブラウザテスト
├── fixtures/                       # テストデータ
│   ├── sample-cards.json           # サンプルカードデータ
│   └── test-settings.json          # テスト用設定データ
├── utils/                          # テスト用ユーティリティ
│   ├── test-helpers.js             # テストヘルパー関数
│   └── mock-data.js                # モックデータ生成
├── favorite-basic-test.html        # お気に入り機能基本テスト
├── favorite-complete-test.html     # お気に入り機能完全テスト
├── favorite-function-test.js       # お気に入り機能JSテスト
├── index.html                      # テストランナーメインページ
└── README.md                       # このファイル
```

## ⭐ お気に入り機能テスト（新規追加）

お気に入り機能の動作を包括的にテストするためのテストスイートです。

### HTMLテスト
- **favorite-basic-test.html**: 基本的なお気に入り機能のテスト
- **favorite-complete-test.html**: 自動テスト機能付きの完全テスト

### 単体テスト
- **unit/components/favorite-component-test.js**: コンポーネントレベルのテスト
- **unit/services/favorite-service-test.js**: サービスレベルのテスト

### 結合テスト
- **integration/card-operations/favorite-integration-test.js**: 他機能との連携テスト

### コンソールテスト
- **favorite-function-test.js**: ブラウザコンソールで実行するテスト

### テスト内容
1. **基本的なお気に入り切り替え**: ボタンクリックでの状態変更
2. **視覚的フィードバック**: 黄色い左側ラインの表示
3. **完了済みカードでの動作**: 完了状態でのお気に入り機能
4. **編集モードでの動作**: 編集中のお気に入り機能
5. **検索・フィルターとの連携**: 他機能との統合動作

## テストの種類

### 単体テスト (Unit Tests)
- 個別のクラスや関数の動作を検証
- モックやスタブを使用して依存関係を分離
- 高速で実行可能

### 結合テスト (Integration Tests)
- 複数のコンポーネント間の連携を検証
- 実際のデータフローを確認
- APIやサービス間の統合をテスト

### エンドツーエンドテスト (E2E Tests)
- ユーザーの実際の操作フローを検証
- ブラウザ上での動作を確認
- 全体的なアプリケーションの動作をテスト

## テスト実行方法

### 開発サーバーでのテスト
```bash
# テスト用サーバー起動
cd /home/ubuntu/Workshop
python3 -m http.server 8011

# ブラウザでテストページにアクセス
# http://localhost:8011/tests/
```

### 個別テストの実行
各テストファイルは独立して実行可能です。

## テストデータ

### fixtures/sample-cards.json
テスト用のサンプルカードデータを含みます。

### fixtures/test-settings.json
テスト用の設定データを含みます。

## テストユーティリティ

### utils/test-helpers.js
- DOM操作のヘルパー関数
- アサーション関数
- テスト環境のセットアップ関数

### utils/mock-data.js
- モックデータの生成関数
- ランダムなテストデータの作成
- 特定のシナリオ用データの準備

## 注意事項

- テストファイルは本番環境には含めないでください
- テストデータは個人情報を含まないようにしてください
- テスト実行前に必ずローカルサーバーを起動してください
