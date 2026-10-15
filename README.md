# KoiRela

恋愛の悩みを、匿名で相談員に1対1チャット相談できるサービスです。

## 現在のプロダクト仕様

- 15分 100円
- 1対1リアルタイムチャット
- 相談員は「経験者 / 資格者」
- 名前・相談内容・相談員の性別で検索
- 15分経過で自動終了、必要なら15分延長
- 通報・ブロック
- 相談員による外部SNS/連絡先誘導は1回目警告、2回目で相談員アカウント停止
- 違反ログ・通報・停止解除を扱う運営管理画面

## ファイル

| ファイル | 内容 |
|---|---|
| index.html | モバイルアプリUI / デモ |
| admin.html | 運営管理UI / デモ |
| lp.html | ランディングページ |
| src/koirela-backend.js | Supabase本番クライアント |
| src/admin-backend.js | 運営管理用バックエンドアダプター |
| supabase/migrations | DB / RLS / Storage / モデレーション |
| supabase/functions | 相談開始、決済、延長、終了処理など |
| PRODUCTION_IMPLEMENTATION.md | 本番化ロードマップ |

## 本番化

静的UIはそのまま残しつつ、Supabase + Stripe + Capacitorを使った本番基盤を追加しています。

セットアップ前は既存のデモUIが動きます。本番接続にはSupabaseプロジェクト、OAuth設定、Stripe、Apple Developer設定が必要です。

## 開発

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
```

iOSシェル:

```bash
npx cap add ios
npm run native:sync
npm run native:ios
```

## Secret

`.env.example` を参照してください。Supabase service role、Stripe secret、Webhook secret、APNs秘密鍵はブラウザへ置かないでください。

## ブランチ運用

大きな変更は実装単位でコミットし、mainへ直接大きな変更を入れない方針です。
