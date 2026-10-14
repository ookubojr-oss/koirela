# KoiRela Web

スマホ向け相談者Webクライアント。既存のSupabase Auth/DB/Realtime/Edge FunctionsとStripe PaymentIntentを利用します。相談員の受諾は既存mobileから行います。

## 開発・Vercel

`cd web && npm install && cp .env.example .env.local && npm run dev`

Vercelでこのリポジトリを連携し、Root Directory を `web` に設定してください。環境変数 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` を設定します。決済テストに進む前に、KoiRela用Stripe**テストアカウント**の `VITE_STRIPE_PUBLISHABLE_KEY`（`pk_test_` で始まる公開可能キー）も設定してください。未設定でもログイン画面は表示されますが、決済開始を拒否します。ほかのサービスのStripeキーを流用しないでください。Stripe secret/service role key はWebへ渡さないでください。Supabase AuthのSite URL / Redirect URLs に公開URLを追加し、既存のStripe webhookとEdge Functionsを稼働させてください。

初回も延長もEdge Functionが100円のPaymentIntentを生成し、Stripe Payment Elementで確定します。決済後の相談状態と延長時間はwebhookが確定し、画面はSupabaseの状態を再取得します。通信や決済の失敗時は再試行できます。決済完了画面だけで相談を開始した扱いにはしません。

相談者側のログイン・登録、相談員一覧、決済、待機、チャット、延長、終了に対応。相談員側は既存mobileを使用します。実データでの通し試験にはSupabase/Stripeのテスト設定、承認済み相談員と相談員用アカウントが必要です。

## 2026-10-14 テスト公開の状況

- Web URL: https://koirela-web.vercel.app/
- Vercel: Hobby `koirela-web` プロジェクト、GitHub main / Root Directory `web`、Viteビルド成功、Production・Previewに公開用Supabase接続キーを設定済み。
- Supabase Tokyo: `mxygxdpzhqsnlewjctgg` は ACTIVE_HEALTHY に復旧、SQL接続成功。バックエンドにあるEdge Functionsの状態はACTIVE。
- テスト用公開中: Stripe publishable keyは未設定。決済を開始できないようWeb UI・操作を制限している。
- Webのログイン画面の表示と一般公開URLへのアクセスは確認済み。実際のメール登録・ログイン・2端末チャットは未検証。
- リリース前: KoiRela専用Stripeの**テストアカウント**を再接続し、決済・15分延長・webhook・取消/返金・相談員応答まで通し確認すること。
- リリース前: 特商法の事業者情報、プライバシーポリシー等のドラフト・サポート窓口を確定すること。
- テスト公開ページは `noindex,nofollow` 設定で、検索結果への掲載を抑制する。一般公開時に解除する。
- Vercel接続のAPIトークンはGit接続済みアカウントと権限が一致しない場合がある。変更は実際に権限を持つVercel UIから行う。
