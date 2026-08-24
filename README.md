# RealTimeApp

設計は [design.md](./design.md) を参照。

## 構成

- `packages/shared` — フロント/サーバー共通の型定義(ビルド不要、TSソースを直接参照)
- `server` — Express(REST API) + Hocuspocus(Yjs同期)を同一プロセスで起動
- `client` — React + Vite + dnd-kit + Yjs

## セットアップ手順(ユーザー実行)

design.md 9節の方針により、コマンド実行はユーザー側で行ってください。

```bash
# 1. 依存関係インストール(ルートでワークスペース一括)
npm install

# 2. サーバー環境変数を用意
cp server/.env.example server/.env
# server/.env の DATABASE_URL を実際のPostgreSQL接続先に、JWT_SECRETを任意のランダム文字列に変更する

# 3. クライアント環境変数を用意(デフォルトのままでローカル開発可)
cp client/.env.example client/.env

# 4. Prisma: クライアント生成 + マイグレーション適用
npm run prisma:generate --workspace=server
npm run prisma:migrate --workspace=server

# 4-1. (任意) シードデータ投入 — ログイン確認用ユーザーを2人作成
npm run prisma:seed --workspace=server

# 5. 開発サーバー起動(別ターミナルで2つ)
npm run dev:server
npm run dev:client
```

- サーバー: http://localhost:3312 (REST API + `/collaboration` でWebSocket)
- クライアント: http://localhost:5173

## シードユーザー(ログイン確認用)

`npm run prisma:seed --workspace=server` を実行すると、以下の2ユーザーが作成されます(`server/prisma/seed.ts`)。

| 名前 | メールアドレス | パスワード |
| --- | --- | --- |
| ユーザー1 | user1@example.com | password123 |
| ユーザー2 | user2@example.com | password123 |

## 動作確認

1. `http://localhost:5173/signup` でユーザー登録、またはシードユーザー(上記)でログイン
2. ボード画面でラインにパネルを追加し、別のラインへドラッグ&ドロップ
3. 別ブラウザ(または別プロファイル)で同じアカウント or 別ユーザーでログインし、同時編集・編集中表示・履歴記録(`POST /history`)を確認
