# KoiRela 本番化ロードマップ

既存のHTMLプロトタイプを壊さず、本番化に必要な基盤を段階的に追加します。

## 追加済みの基盤

- Supabaseを前提とした認証・DB・Realtimeクライアント
- ユーザー / 相談員 / 管理者のロール
- 相談員プロフィール・審査・受付状態・停止状態
- 15分100円の相談データモデル
- サーバー側 starts_at / ends_at による15分タイマー
- 相談中だけ送信可能なメッセージRLS
- 決済・評価・通報・違反ログ・運営監査ログ
- 通知設定とpush token用テーブル
- 相談員検索用ディレクトリ
- CapacitorによるiOSアプリ化の土台

## 外部サービス接続後に有効化するもの

### Supabase
.env に VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を設定し、supabase/migrations を適用します。

### ログイン
Google / Apple はSupabase OAuthへ接続する構成です。LINEはカスタムOAuthフローをサーバー側で実装します。

### 決済
現在のUIは15分100円です。決済事業者を確定後、決済成功Webhookから activate-consultation を呼び出します。

### リアルタイムチャット
messages をSupabase Realtime購読します。RLSで参加者だけが閲覧でき、相談時間内だけ送信できます。

### 通知
iOSではAPNsトークンを push_tokens に登録し、返信、相談リクエスト、残り1分、受付開始を通知します。

### 運営
本番管理画面では admin ロールを必須とし、通報・違反ログ・停止解除・審査・監査ログをDB経由で操作します。localStorageは本番では使用しません。

### 相談員本人確認
本人確認書類・資格証はprivate storageへ保存します。停止済み相談員の再登録対策用識別子は生データではなく不可逆化と厳格なアクセス制御を前提にします。

## 残タスク

- index.html のログイン処理をSupabase Authへ接続
- 相談員一覧を counselor_directory から取得
- チャットをRealtimeへ置換
- 決済事業者の確定とWebhook署名検証
- 15分延長処理
- APNs実装
- 管理画面をDB接続
- Storage bucket / upload policy
- LINE OAuth
- lp.html を現行デザイン・15分100円へ更新
- モバイルE2E
- Capacitor iOSプロジェクト生成、Bundle ID、署名、TestFlight
- 正式な利用規約・プライバシーポリシー・表示義務の確認

## Secret管理

ブラウザに置いてよいのはSupabaseのanon keyまでです。service role、決済secret、Webhook secret、APNs private keyはクライアントへ含めません。
