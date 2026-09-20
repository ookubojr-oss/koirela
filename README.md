# KoiRela

恋愛の悩みを、匿名で相談員と1対1のリアルタイムチャットで話せるサービスです。

## 現在のプロダクトモデル

- 1対1のリアルタイムチャット
- 15分 100円
- 15分で自動終了
- 延長は15分 100円
- 相談員は「経験者」と「資格者」
- 相談員の性別は任意登録、検索条件としてのみ利用
- 一般ユーザーは匿名・ニックネーム中心
- 相談員による外部SNS・連絡先への誘導は禁止
  - 1回目: メッセージをブロックして警告
  - 2回目: 相談員アカウント停止
- ユーザー通報は運営確認後に違反回数へ反映

## ブランチ

- `main`: 安定版
- `feature/simple-3tab-structure`: 現在のHTMLデザインプロトタイプ
- `feature/production-foundation`: Supabase / Stripe / Expoを使う本番化基盤

mainへの統合はレビュー後に行います。

## ファイル構成

- `index.html` — 現行モバイルUIプロトタイプ
- `lp.html` — LP
- `admin.html` — localStorageを使ったデモ管理画面
- `admin-live.html` — Supabase接続用の運営管理画面
- `web/` — 本番Web接続ヘルパー
- `mobile/` — Expo / React Nativeアプリ
- `supabase/migrations/` — DB/RLS/運営RPC
- `supabase/functions/` — 決済、相談開始、メッセージ、モデレーション等のEdge Functions
- `docs/PRODUCTION_ARCHITECTURE.md` — 本番アーキテクチャ
- `docs/ENV_SETUP.md` — 外部サービス設定

## 本番化の原則

料金、相談開始/終了時刻、決済成功、相談員停止状態、違反回数などはクライアントを信用せず、サーバー側を正とします。

メッセージ送信もEdge Functionを経由し、相談員の外部誘導チェックをサーバー側で実行します。

## 外部設定が必要なもの

ソースコードだけでは本番サービスは起動しません。Supabase、Stripe、Apple Developer / App Store Connect、Google OAuth、LINE認証、EAS、プッシュ通知などの本番アカウント・秘密鍵・審査設定が必要です。

秘密鍵はGitにコミットしないでください。
