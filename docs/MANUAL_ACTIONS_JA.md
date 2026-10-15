# KoiRela 手動作業チェックリスト

更新: 2026-10-05

コード・Supabase側で自動化できる作業は原則こちらで進める。
このファイルには、本人確認や外部サービスの管理画面など、オーナー本人の操作が必要な作業だけを残す。

## まずやること

### 1. Stripeアカウントを統一する

現在、ブラウザで開いているKoiRela用Stripeアカウントと、ChatGPT側で接続されているStripeアカウントが一致していない可能性がある。

やること:
- KoiRelaで使うStripeアカウントを1つに決める
- ChatGPTのStripe接続もその同じアカウントへ接続する
- Stripe Dashboardでそのアカウントのテスト用APIキーを使う
- Supabase Edge Function Secretsの `STRIPE_SECRET_KEY` を同じアカウントのテスト用Secret keyにする
- Supabaseの `STRIPE_WEBHOOK_SECRET` は、その同じアカウントに作ったKoiRela WebhookのSigning secretにする

注意:
- `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` は別物
- キーはGitHubやチャットへ貼らない
- 本番切替の指示があるまでTest modeのままにする

### 2. Stripe本人確認を完了する

Stripe Dashboardで要求された項目だけ本人が入力する。

例:
- 事業形態
- 本人・事業者情報
- 振込先
- 日本向け確認事項
- Stripe利用規約への同意

完了後に確認するもの:
- カード決済が利用可能になっていること
- Connectを使う場合は必要なCapabilityが有効になっていること

## Stripeが終わったら

こちらで実施:
- Webhook疎通確認
- 100円テスト決済
- キャンセル
- 返金
- 15分延長
- Stripe Connect報酬フロー
- Supabaseのpayments / consultationsの整合性確認

## Expo / EAS

本人操作が必要:
- Expoアカウントへログイン
- KoiRelaのEAS Projectを作成またはリンク

その後必要:
- `mobile/app.json` の `REPLACE_WITH_EAS_PROJECT_ID` を実IDに置換
- EAS environmentに次を登録
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_LEGAL_BASE_URL`

## Apple Developer

本人操作が必要:
- Apple Developer Program
- Bundle ID `jp.koirela.app` の登録
- Merchant ID `merchant.jp.koirela.app` の登録
- Apple Pay / Sign in with Apple / Push通知に必要な設定
- App Store ConnectでKoiRelaを作成

## Google / LINEログイン

本人操作が必要:
- Google OAuthプロジェクトの認証情報作成
- LINE Login Channel作成
- LINE Channel ID / Secret / Callback URL設定

秘密情報はSupabase Secretへ登録する。GitHubには入れない。

## 公開前テスト

相談者用端末と相談員用端末の2台で確認する。

順番:
1. 新規登録 / ログイン
2. 相談員を探す
3. 100円決済
4. 相談員へリクエスト
5. 相談員が受諾
6. 15分リアルタイムチャット
7. 残り1分通知
8. 100円で15分延長
9. 相談終了
10. 評価 / 通報 / ブロック
11. 履歴
12. キャンセル / 返金
13. アプリ強制終了後の復帰
14. アカウント削除

## App Store提出前

必要:
- 運営事業者情報を利用規約・特商法・プライバシーポリシーへ反映
- サポートURL / プライバシーポリシーURL
- アプリアイコン
- スプラッシュ
- App Storeスクリーンショット
- App Privacy回答
- 審査用の相談者アカウント / 相談員アカウント
- TestFlight最終確認

## 現在こちらで完了している主な部分

- Expo / React Nativeアプリ基盤
- Supabase DB / RLS / Realtime / Storage
- 15分100円 / 延長15分100円
- Stripe PaymentIntent / Webhook / 返金 / Connect基盤
- 相談チャット / タイマー / 復帰
- 相談員申請 / 審査基盤
- 通報 / ブロック / モデレーション
- 管理画面基盤
- アカウント削除
- LINE OAuthコード基盤
- App Store / Google Play向け決済方針資料
- 匿名DB権限の最小化
- 一般ユーザーによるadmin自己昇格・偽決済・偽相談開始の拒否テスト
- GitHub Actions / TypeScript / Expo依存チェック

PR #2は、実機テストと外部サービス設定が完了するまでDraftのままにする。
