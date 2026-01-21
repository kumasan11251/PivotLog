# Firebase Cloud Functions for PivotLog

PivotLogアプリのバックエンドAPI。Gemini APIをサーバーサイドで安全に呼び出します。

## セットアップ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. Firebase CLIのインストール（未インストールの場合）

```bash
npm install -g firebase-tools
firebase login
```

### 3. APIキーの設定

Gemini APIキーをFirebaseのシークレットとして設定します：

```bash
# Firebaseプロジェクトを選択
firebase use <your-project-id>

# シークレットを設定
firebase functions:secrets:set GEMINI_API_KEY
# プロンプトが表示されたら、Gemini APIキーを入力
```

**重要**: APIキーは絶対にコードにハードコードしないでください。常にシークレットとして管理します。

### 4. ローカルでのテスト（オプション）

```bash
# エミュレーターを起動
npm run serve

# または個別に
firebase emulators:start --only functions
```

ローカルテスト時は `.secret.local` ファイルを作成してAPIキーを設定できます：

```bash
echo "GEMINI_API_KEY=your-api-key-here" > .secret.local
```

`.secret.local` は `.gitignore` に含まれています。

### 5. デプロイ

```bash
npm run deploy

# または
firebase deploy --only functions
```

## エンドポイント

### `generateReflection`

日記の内容に基づいてAIリフレクションを生成します。

**タイプ**: Firebase Callable Function
**リージョン**: asia-northeast1（東京）

**リクエスト**:

```typescript
{
  goodTime: string; // 今日良かったこと
  wastedTime: string; // 今日後悔していること
  tomorrow: string; // 明日大切にしたいこと
  currentAge: number; // 現在の年齢
  remainingYears: number; // 目標寿命までの残り年数
  remainingDays: number; // 残り日数
}
```

**レスポンス**:

```typescript
{
  content: string; // 共感メッセージ
  question: string; // 問いかけ
  generatedAt: string; // 生成日時 (ISO 8601)
  modelVersion: string; // モデルバージョン
}
```

**認証**: Firebase Authentication必須

## セキュリティ

- APIキーはFirebase Secretsで管理（コードに含めない）
- Firebase Authenticationによる認証が必要
- 入力バリデーションを実施
- エラー時はフォールバックレスポンスを返す

## トラブルシューティング

### シークレットが設定されていない場合

```
Error: GEMINI_API_KEY is not configured
```

→ `firebase functions:secrets:set GEMINI_API_KEY` を実行

### 認証エラー

```
Error: unauthenticated
```

→ クライアント側でFirebase Authenticationでログインしてから呼び出す

### リージョンエラー

クライアント側で `asia-northeast1` リージョンを指定していることを確認：

```typescript
functions()
  .app.functions("asia-northeast1")
  .httpsCallable("generateReflection");
```

## 開発

### ビルド

```bash
npm run build
```

### リントチェック

```bash
npm run lint
```

### ログ確認

```bash
firebase functions:log
```
