# KoiRela Web

スマホ向け相談者Webクライアント。既存のSupabase Auth/DB/Realtime/Edge FunctionsとStripe PaymentIntentを利用します。相談員の受諾は既存mobileから行います。

## 開発・Vercel

`cd web && npm install && cp .env.example .env.local && npm run dev`

Vercelでこのリポジトリを連携し、Root Directory を `web` に設定してください。環境変数 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_STRIPE_PUBLISHABLE_KEY` を設定します。Stripe secret/service role key はWebへ渡さないでください。Supabase AuthのSite URL / Redirect URLs に公開URLを追加し、既存のStripe webhookとEdge Functionsを稼働させてください。

初回も延長もEdge Functionが100円のPaymentIntentを生成し、Stripe Payment Elementで確定します。決済後の相談状態と延長時間はwebhookが確定し、画面はSupabaseの状態を再取得します。通信や決済の失敗時は再試行できます。決済完了画面だけで相談を開始した扱いにはしません。

相談者側のログイン・登録、相談員一覧、決済、待機、チャット、延長、終了に対応。相談員側は既存mobileを使用します。実データでの通し試験にはSupabase/Stripeのテスト設定、承認済み相談員と相談員用アカウントが必要です。
