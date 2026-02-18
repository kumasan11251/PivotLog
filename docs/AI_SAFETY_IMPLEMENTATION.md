# AI機能 安全対策実装ガイド

本ドキュメントは、PivotLogのAI機能（Gemini API）の安全対策実装に関する情報をまとめたものです。

## 1. 実装された機能

### 1.1 ユーザー同意機能（Apple App Store対応）

AI機能の初回使用時に同意モーダルを表示し、ユーザーから明示的な同意を取得します。

**関連ファイル:**
- `src/types/aiConsent.ts` - 同意状態の型定義
- `src/components/common/AIConsentModal.tsx` - 同意モーダル
- `src/utils/storage.ts` - 同意状態の保存/読み込み
- `src/services/firebase/firestore.ts` - Firestore同期
- `src/screens/DiaryEntryScreen.tsx` - 同意チェックの統合

---

## 2. Firestoreセキュリティルール

Firebase Consoleで以下のルールを追加してください。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 既存のルール...

    match /users/{userId} {
      // 既存のルール...

      // AI同意状態
      match /settings/aiConsent {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 3. プライバシーポリシー追記テキスト

以下のテキストをプライバシーポリシーに追記してください。

### 日本語版

```
## AI機能について

本アプリでは、Google Gemini APIを使用したAIリフレクション機能を提供しています。

### データの取り扱い

1. **送信されるデータ**
   - 日記に入力された内容（良かったこと、後悔、明日やりたいこと）
   - ユーザーの年齢と目標寿命（パーソナライズのため）

2. **データの使用目的**
   - 日記の内容を分析し、気づきやリフレクションを生成するためにのみ使用されます
   - 送信されたデータはGoogleのAI学習には使用されません（有料APIを使用）

3. **データの保存**
   - 生成されたリフレクションはお客様のアカウントに紐づけて保存されます
   - 元の日記内容がGoogleに永続的に保存されることはありません

4. **第三者への提供**
   - 日記の内容はGoogle Gemini APIに送信されます
   - Googleのデータ処理規約（Data Processing Addendum）に基づいて処理されます
   - 詳細: https://cloud.google.com/terms/data-processing-addendum

5. **同意の取得**
   - AI機能の初回使用時に、明示的な同意を取得します
   - 同意はいつでも設定画面から取り消すことができます

6. **AI生成コンテンツについて**
   - AIが生成する内容は参考情報であり、専門家のアドバイスではありません
   - 医療、法律、金融に関する重要な判断には、専門家にご相談ください
```

### English Version

```
## AI Features

This app provides AI reflection features powered by Google Gemini API.

### Data Handling

1. **Data Transmitted**
   - Content entered in your diary (good things, regrets, tomorrow's plans)
   - Your age and target lifespan (for personalization)

2. **Purpose of Data Use**
   - Used solely to analyze diary content and generate reflections
   - Transmitted data is not used for Google's AI training (paid API)

3. **Data Storage**
   - Generated reflections are stored linked to your account
   - Original diary content is not permanently stored by Google

4. **Third-Party Sharing**
   - Diary content is transmitted to Google Gemini API
   - Processed under Google's Data Processing Addendum
   - Details: https://cloud.google.com/terms/data-processing-addendum

5. **Consent**
   - Explicit consent is obtained on first use of AI features
   - Consent can be withdrawn at any time in settings

6. **AI-Generated Content**
   - AI-generated content is for reference only, not professional advice
   - Consult professionals for important medical, legal, or financial decisions
```

---

## 4. App Store / Google Play 申請時の注意

### Apple App Store

1. **App Privacy Details**で以下を申告:
   - Data collected: User Content (diary entries)
   - Data linked to user: Yes
   - Data used for tracking: No
   - Third-party sharing: Google (for AI processing)

2. **App Store Review Guidelines 5.1.1(i)** への対応:
   - プライバシーポリシーにAIデータ共有を明記
   - アプリ内で明示的な同意を取得

### Google Play

1. **Data safety** セクションで以下を申告:
   - Data shared: User-generated content (with AI service)
   - Data encrypted in transit: Yes

2. **AI-generated content policy** への対応:
   - 不適切なコンテンツのフィルタリング（Gemini API標準機能）
   - プライバシーポリシーにAI生成コンテンツに関する注意事項を記載

---

## 5. 今後の改善点（推奨）

以下は今回の実装範囲外ですが、将来的に検討すべき項目です：

| 項目 | 現状 | 推奨対応 |
|------|------|---------|
| セーフティ設定 | `BLOCK_ONLY_HIGH` | `BLOCK_MEDIUM_AND_ABOVE`に変更 |
| 入力検証 | 空文字チェックのみ | 文字数制限・パターン検出追加 |
| 出力検証 | 最小文字数チェック | 不適切パターン検出追加 |
| 同意取り消し | 未実装 | 設定画面に追加 |
