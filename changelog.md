# Changelog

All notable changes to the Gemini Live Voice Companion application will be documented in this file.

## [Unreleased]

### Added
- プロジェクト初期環境構成: Express, WebSocket (`ws`), Zod, Vitest 導入
- アプリケーション基本メタデータ設定 (`metadata.json`, `index.html`)
- 開発計画書 `plan.md` および更新履歴 `changelog.md` の策定
- スキーマ駆動型定義 (Zod) による通信プロトコル仕様策定
- [TDD Cycle 1] ドメインスキーマ・セッション集約エンティティの実装とテスト (BDD/TDD Red->Green->Refactor)
- [TDD Cycle 2] PCM 16bit 相互変換・リサンプリング・RMS音量計算ユーティリティの実装とテスト (BDD/TDD Red->Green->Refactor)
- [TDD Cycle 3] WebSocket プロトコルハンドラー・状態マシン・メッセージディスパッチャーの実装とテスト (BDD/TDD Red->Green->Refactor)
- [Feature] Express + WebSocket (`/ws/live`) + Gemini 3.8 Live API (`gemini-3.8-live`) サーバー統合 (`server.ts`)
- [Feature] Web Audio API 16kHz PCM マイク入力・24kHz PCM 再生キュー・即時割り込み（Interruption）処理 (`AudioManager`)
- [Feature] Canvas オーディオ波形・発話オーブビジュアライザー (`AudioVisualizerCanvas`)
- [Feature] ペルソナ設定・プロンプトカスタマイズモーダル (`PersonaPresetModal`)
- [Feature] リアルタイム対話ログ・書き起こしフィード・テキスト送信機能 (`TranscriptFeed`)
- [TDD Cycle 4] セッション履歴集約エンティティ (`ChatSessionAggregate`) と永続化リポジトリ (`SessionRepository`) の実装とテスト (BDD/TDD Red->Green->Refactor)
- [Feature] ユーザー発言・Gemini応答の時系列チャットUI (`ChatTimelineView`): 吹き出しアバター、発話インジケータ、コピー機能、Markdownエクスポート
- [Feature] セッションごとの履歴保持・切り替えドロワー (`SessionHistorySidebar`): 新規セッション作成、キーワード検索、リネーム、削除、自動ローカル永続化
- [Feature] Gemini Live API ユーザー音声認識 (`inputTranscription` / `interimInputTranscription`) と Web Speech API によるシームレスな発話リアルタイム同期
- [Feature] GitHub Pages (`github.io`) デプロイ対応: Vite 相対パス設定 (`base: './'`)、SPA用 `404.html` 生成、GitHub Pages環境自動検出 & WebSocket URL動的解決 (`resolveLiveWebSocketUrl`)、自動デプロイワークフロー (`.github/workflows/deploy.yml`)、デプロイ手順書 (`DEPLOY_GITHUB_PAGES.md`)
