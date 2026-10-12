# GitHub Pages (github.io) デプロイ手順書

本アプリケーションは、GitHub Pages（`https://<username>.github.io/<repository-name>/`）への静的サイト自動デプロイに対応しています。

---

## 1. 自動デプロイの設定手順 (推奨: GitHub Actions)

本リポジトリには `.github/workflows/deploy.yml` が含まれており、GitHub にプッシュするだけで自動的にビルド＆デプロイが行われます。

### Step 1: GitHub リポジトリを作成してプッシュ
```bash
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

### Step 2: GitHub Pages の Source を設定
1. GitHub で対象のリポジトリを開きます。
2. **Settings** タブをクリックします。
3. 左側メニューの **Pages** を選択します。
4. **Build and deployment** セクションの **Source** を **「GitHub Actions」** に変更します。

### Step 3: デプロイの確認
1. **Actions** タブで `Deploy to GitHub Pages` ワークフローが自動実行され、成功することを確認します。
2. デプロイ完了後、`https://<あなたのユーザー名>.github.io/<リポジトリ名>/` にアクセスするとアプリが起動します。

---

## 2. アーキテクチャとバックエンド接続について

GitHub Pages は**静的ホスティング（HTML/CSS/JS）**のため、Node.js サーバーや常時稼働 WebSocket サーバーを直接ホストすることはできません。

本アプリでは、GitHub Pages 環境（`*.github.io`）を自動検出し、以下のようにハイブリッド接続を行います：

1. **デフォルト自動接続**:
   - `github.io` ドメインで起動した場合、AI Studio / Cloud Run のバックエンド WebSocket サーバー（`wss://.../ws/live`）へ自動接続します。
   - APIキーはサーバー側に安全に保管されたまま、クライアントから低遅延で Gemini 3.8 Live API と音声対話が可能です。

2. **カスタムバックエンドURLの指定**:
   - 独自の Cloud Run / 外部サーバーにバックエンドをデプロイした場合、画面右上の「**ペルソナ設定**」モーダル最下部にある「**バックエンドサーバー設定**」から接続先URLをいつでも変更・保存できます。

---

## 3. 手動ビルド確認コマンド

ローカル環境で GitHub Pages 向けビルドを確認する場合：
```bash
npm run build
```
- `dist/index.html` および `dist/404.html` (SPA リフレッシュ対策用) が相対パス（`base: './'`）で出力されます。
