# KoiRela Web — 指定デザイン復元版

## デザイン・画面構成（2026-10-14）

このWeb版の**デザイン唯一の正本**は、ユーザーが指定した次の固定コミットです。

- GitHub: https://github.com/ookubojr-oss/koirela/blob/98199c71b22ac53ab224eb1ad7ca7c302d7e2be9/index.html
- 表示: https://raw.githack.com/ookubojr-oss/koirela/98199c71b22ac53ab224eb1ad7ca7c302d7e2be9/index.html#home
- Web公開: https://koirela-web.vercel.app/#home
- 指定デザインの**元のCSS 9,019文字は完全一致**。元のHTMLにある7画面を順番・ページ構造そのまま保持しています。
- 7画面: welcome、home、find、profile、mypage、history、chat。
- 下部タブは **ホーム・さがす・マイページ**。別ブランチの29画面版や「探す・トーク・マイページ」版と混ぜないでください。
- web/index.html に元のデザインを保持し、web/src/commit98199-bridge.js がバックエンド接続を担当。認証だけ必要時に表示する隔離オーバーレイ（commit98199-auth.css）です。

## 現在の稼働範囲

- Supabase Tokyo: mxygxdpzhqsnlewjctgg。Vercel Production/Preview の環境変数 VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を使用。
- ログイン・新規登録: Supabase Auth。元の7画面にログイン画面がないので、マイページなどからモーダルで表示。
- 相談員一覧: Supabaseの承認済み・受付中の本物のデータのみ表示。オリジナルの架空の相談員、架空の口コミ、相談履歴、AIの自動返信は本番表示しない。
- 相談員プロフィール、相談履歴: Supabaseに接続。進行中の相談が存在する場合はチャットを開き、Realtimeでメッセージ更新を受け取る。
- 初回15分100円、延長15分100円。**KoiRela専用Stripeテストアカウントが未接続のため、決済開始を無効化**。準備中のメッセージを表示する。
- テスト用のWeb公開。検索エンジン対策として noindex,nofollow を維持。
- Apple/Google/LINEログイン、相談員専用機能、Web支払履歴の全機能はこの7画面版には含めていません。未実装を実装済みと表示しないこと。
- 実ユーザーの登録・二者チャット・Stripeテスト決済はE2E試験が未完了。

## 開発・デプロイ

`cd web && npm install && npm run dev`

Vercel は GitHub の main ブランチ、Root Directory `web`、Vite build `npm run build`、Output Directory `dist` で自動デプロイ。既存の mobile は変更しない。

環境変数には公開用の Supabase URL と Publishable API key **のみ**。service-role/DB秘密鍵/Stripe秘密鍵をブラウザに配置しない。決済を有効にする前にKoiRela専用のStripeテスト環境、Edge Functions、webhook、規約・プライバシーポリシー・特商法表記、返金・キャンセル条件を点検する。
