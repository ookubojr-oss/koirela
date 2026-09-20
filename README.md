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
- お気に入り / 再相談 / 決済履歴 / 評価 / 通報 / ブロック
- 相談員の受付ON/OFF、売上・報酬、Stripe Connect振込基盤
- 相談員による外部SNS・連絡先への誘導は禁止
  - 1回目: メッセージをブロックして警告
  - 2回目: 相談員アカウント停止
- ユーザー通報は運営確認後に違反回数へ反映

## ブランチ

- `main`: 安定版
- `feature/simple-3tab-structure`: HTMLデザインプロトタイプ
- `feature/production-foundation`: Supabase / Stripe / Expoを使う本番化基盤

mainへの統合はレビュー後に行います。

## 本番化基盤に含まれるもの

- Supabase Auth / Postgres / Realtime / Storage / RLS
- email / Apple / Google / LINEログイン基盤
- Stripe PaymentIntent / 返金 / Stripe Connect相談員報酬基盤
- サーバー管理15分タイマー
- リアルタイムチャットとアプリ再起動後の相談復帰
- Push通知 / 残り1分通知 / お気に入り受付開始通知
- モデレーション / 通報 / 停止 / 管理者監査ログ
- 利用者・相談員の強制停止、返金、相談強制終了
- APIレート制限 / 不正利用対策
- クライアント・Push・決済エラー監視基盤
- アカウント完全削除処理
- App Store / 実機テスト / Maestroスモークテスト資料

## ファイル構成

- `index.html` — 現行HTML UIプロトタイプ
- `lp.html` — LP
- `admin.html` — localStorageのデモ管理画面
- `admin-live.html` — Supabase接続の本番運営管理画面
- `web/` — 本番Web接続ヘルパー
- `mobile/` — Expo / React Nativeアプリ
- `mobile/store/` — App Storeメタデータ・プライバシー申告作業票
- `supabase/migrations/` — DB / RLS / 運営RPC
- `supabase/functions/` — 決済、認証、相談、メッセージ、モデレーション、送金等
- `legal/` — 利用規約等の公開準備用ドラフト
- `.maestro/` — 実機E2Eスモークフロー
- `docs/PRODUCTION_ARCHITECTURE.md` — 本番アーキテクチャ
- `docs/PRODUCTION_CHECKLIST.md` — 公開チェックリスト
- `docs/SECURITY_AND_RATE_LIMITS.md` — セキュリティ・レート制限
- `docs/APP_STORE_RELEASE.md` — App Store公開準備
- `docs/DEVICE_TEST_MATRIX.md` — 実機テスト項目

## 本番化の原則

料金、相談開始/終了時刻、決済成功、返金、相談員/利用者停止状態、違反回数、相談員報酬などはクライアントを信用せず、サーバー側を正とします。

メッセージ送信もEdge Functionを経由し、相談員の外部誘導チェックとレート制限をサーバー側で実行します。

## 外部設定が必要なもの

ソースコードだけでは本番サービスは起動しません。Supabase、Stripe、Apple Developer / App Store Connect、Google OAuth、LINE Developers、Expo EAS、APNs/FCM等の本番アカウント・秘密鍵・審査設定が必要です。

秘密鍵はGitにコミットしないでください。
