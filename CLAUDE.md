# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

すべて日本語で回答してください。
判断を求める場合は、必ず「AskUserQuestion」ツールを使用すること。

## プロジェクト概要

PivotLogは、残りの人生時間を可視化し、毎日の振り返り日記を通じて意識的な生き方を支援するReact Native/Expoアプリ。ユーザーが設定した目標寿命までのカウントダウン表示と、3つの問い（よかったこと・ちょっとした後悔・明日やりたいこと）による日記機能が中心。

## 開発コマンド

```bash
# 全プラットフォーム同時ビルド（iOS シミュレーター + Android エミュレーター + iOS 実機）
npm run dev:all:device

# シミュレーター/エミュレーターのみ
npm run dev:all

# 個別起動
npm run ios
npm run android
npm run ios:device

# リント
npm run lint
npm run lint:fix

# キャッシュクリア起動
rm -rf node_modules/.cache && npx expo start --clear

# Cloud Functions
cd functions && npm run build          # TypeScriptビルド
cd functions && npm run serve          # ローカルエミュレーター
cd functions && npm run deploy         # デプロイ
```

**ビルドを依頼された場合は、常に `npm run dev:all:device` を使用する。**

## 技術スタック

- **Expo SDK 54** / React Native 0.81.5 / React 19.1.0 / TypeScript strict
- **ナビゲーション**: React Navigation v7 (Native Stack)
- **状態管理**: React Context API（Auth, Theme, Subscription, WeeklyInsight, MonthlyInsight）
- **ストレージ**: AsyncStorage（ローカル）+ Firestore（クラウド同期）
- **認証**: Firebase Auth（匿名、Email、Google、Apple Sign In）
- **AI**: Gemini API（Cloud Functions経由でリフレクション・インサイト生成）
- **ウィジェット**: iOS（SwiftUI/WidgetKit）、Android（Kotlin AppWidgetProvider）
- **スタイリング**: StyleSheet API（CSS-in-JSライブラリ不使用）
- **フォント**: Noto Sans JP / プライマリカラー: `#8B9D83`
- **リント**: ESLint flat config + TypeScript, React, React Hooks, React Native plugins

## アーキテクチャ

### ディレクトリ構成

```
src/
├── components/          # UIコンポーネント（common/, diary/, home/, insight/, icons/）
├── contexts/            # React Context（Auth, Theme, Subscription, Insight系）
├── hooks/               # カスタムフック（AI, 日記, インサイト, ウィジェット同期）
├── screens/             # 画面コンポーネント
├── services/firebase/   # Firebase操作（auth, firestore, functions, aiUsage）
├── services/ai/         # AIサービス（プロンプト, リフレクション生成）
├── types/               # 型定義（navigation, widget, aiReflection, subscription等）
├── utils/               # ユーティリティ（storage, widgetBridge, dateUtils等）
├── constants/           # 定数（日記質問, パースペクティブメッセージ等）
└── theme/               # テーマ（colors, fonts, spacing）
functions/src/           # Cloud Functions（Gemini API連携）
targets/widget/          # iOS SwiftUIウィジェット
android/.../pivotlog/    # Androidネイティブ（ウィジェット, ブリッジ）
```

### ナビゲーションフロー

1. `App.tsx`が設定チェック → **InitialSetup**（初回）または **Home**（設定済み）
2. 未認証の場合は**AuthScreen**（匿名ログインも可能）
3. **Home**画面はTabBarでホーム/記録一覧を切り替え（client-side routing、スタックナビゲーションではない）
4. 日記入力・設定編集・インサイト画面は別スタックスクリーン

新画面追加時: `src/types/navigation.ts`の`RootStackParamList`に定義 → `App.tsx`のStack.Navigatorに登録

### ストレージパターン（二層構造）

- **AsyncStorage**: ローカルキャッシュ（`@pivot_log_settings`, `@pivot_log_diaries`）
- **Firestore**: クラウド同期（`users/{userId}/settings`, `diaries`, `homeDisplay`, `widget`, `subscription`）
- 日記エントリのIDは日付文字列（`YYYY-MM-DD`）。保存時は全エントリを読み込み→更新/追加→ソート→全体書き戻し

### ウィジェット通信

- **iOS**: `@bacons/apple-targets`のExtensionStorage → App Group (`group.com.kumasan11251.pivotlog.expowidgets`) → UserDefaults共有
- **Android**: WidgetBridgeModule（Kotlin）によるReact Nativeネイティブブリッジ
- テーマ変更・設定変更時に`src/utils/widgetBridge.ts`経由で自動同期

### サブスクリプション

- **無料**: 日記無制限、AIリフレクション月5回、同一日記再生成3回まで
- **プレミアム**: AI無制限、インサイト生成無制限
- `src/services/firebase/aiUsage.ts`でFirestore上の利用状況を追跡

## コーディング規約

### コンポーネント構造

import順序: React → React Native → サードパーティ → ローカルコンポーネント → utils → types → theme

```tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { HomeScreenNavigationProp } from "../types/navigation";
import { colors, fonts, spacing } from "../theme";
```

型定義 → コンポーネント → StyleSheet → export の順で配置。

### 日付処理

ISO 8601形式（`YYYY-MM-DD`）を使用。タイムゾーン問題を避けるため、`new Date(dateString)`ではなくコンポーネント分解してパースする:

```typescript
const [year, month, day] = settings.birthday.split("-").map(Number);
const birthday = new Date(year, month - 1, day, 0, 0, 0, 0);
```

### テーマ

`src/theme/`から名前付きエクスポートを使用: `import { colors, fonts, spacing } from "../theme"`

新テーマ値は適切なファイルに追加し、`index.ts`経由でエクスポート。

## 注意点

- Expo SDK 54のバージョンピニング（`~`）に従い、個別のアップグレードはしない
- フォント読み込み完了前にテキスト描画しない（`useFonts()`を確認）
- 全画面で`SafeAreaView`を使用
- UIの全テキストは日本語。コメントは日本語・英語混在
- EASビルド: development / preview / production の3チャネル
- Cloud Functions: Node.js 20 / firebase-functions v6
