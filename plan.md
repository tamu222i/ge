# Gemini Live リアルタイム音声対話Webアプリ 開発計画 (plan.md)

## 1. 概要と目的
本アプリケーションは、Google Gemini の最新リアルタイム双方向API（`gemini-3.8-live`）を活用し、ブラウザ上で低遅延かつ自然な音声対話を実現するWebアプリケーションです。

## 2. 設計方針: スキーマ駆動 × 簡易DDD (Domain-Driven Design)
堅牢かつ拡張性の高い設計を実現するため、スキーマ駆動開発（Schema-Driven）と簡易ドメイン駆動設計（DDD）を採用します。

### 2.1 アーキテクチャ階層
```
[Client (Browser)]
  ├─ Presentation / UI (React + Tailwind CSS + Canvas Visualizer)
  ├─ Application Hook (useLiveVoiceSession)
  ├─ Infrastructure (Web Audio API: 16kHz PCM Recorder / 24kHz PCM Player)
  └─ Domain & Schemas (Zod contracts, Session Aggregate, Value Objects)
          ▲
     WebSocket (/ws/live) [Typed JSON Messages + PCM Base64]
          ▼
[Server (Node.js / Express)]
  ├─ WebSocket Gateway (ClientWsServer)
  ├─ Domain & Message Validations (Zod Schema Validation)
  └─ Infrastructure Gateway (Gemini 3.8 Live API via @google/genai ai.live.connect)
```

### 2.2 ドメインモデル (簡易DDD)
- **Value Objects**:
  - `VoiceConfig`: 音声ペルソナ名（`Zephyr`, `Puck`, `Charon`, `Kore`, `Fenrir`）、話し方の設定
  - `AudioChunk`: サンプリングレート（入力16kHz, 出力24kHz）、PCM 16-bit リトルエンディアン形式、Base64
  - `TranscriptTurn`: 発話者（`user` | `model` | `system`）、認識テキスト、確定フラグ、タイムスタンプ
  - `SessionState`: `IDLE` | `CONNECTING` | `CONNECTED` | `LISTENING` | `SPEAKING` | `INTERRUPTED` | `ERROR`
- **Aggregate Root**:
  - `ConversationSession`: セッションの状態遷移、発話ログ履歴の保持、割り込み（Interruption）処理の整合性維持
- **Domain Services / Events**:
  - `AudioFrameProcessor`: 音声データの相互変換と正規化
  - イベント通知: `SESSION_STARTED`, `SPEECH_CHUNK_RECEIVED`, `INTERRUPTED`, `TRANSCRIPT_RECEIVED`

### 2.3 スキーマ仕様 (Zod)
- **クライアント → サーバー (`ClientMessageSchema`)**:
  - `start_session`: セッション設定（voiceName, systemInstruction, thinkingConfig）
  - `audio_chunk`: 16kHz PCM base64 音声チャンク
  - `text_input`: テキストでの補足送信
  - `interrupt`: ユーザーからの明示的割り込み指示
  - `end_session`: セッション終了
- **サーバー → クライアント (`ServerMessageSchema`)**:
  - `session_started`: セッションID・初期化通知
  - `audio_chunk`: 24kHz PCM base64 音声チャンク（モデル発話）
  - `transcript`: リアルタイム音声書き起こし・テキスト応答
  - `interrupted`: 割り込み発生通知（クライアント側再生キュー即時フラッシュ用）
  - `status`: セッション状態の変更通知
  - `error`: エラー種別・メッセージ

## 3. テスト戦略: TDD & BDD (Red -> Green -> Refactor)
- **BDD (Behavior-Driven Development)**: ユーザーストーリー・受け入れ条件を `describe('Given ... When ... Then ...')` のシナリオ形式で記述
- **TDD (Test-Driven Development)**:
  1. **RED**: 失敗するテストを先行実装
  2. **GREEN**: 最小限の実装でテストを通過
  3. **REFACTOR**: コード整理・パフォーマンス最適化・型安全性の強化
  4. **COMMIT**: 各サイクルごとにGitコミットを実施

## 4. マイルストーン & 進行ステップ
- [x] Step 0: プロジェクト初期設定、依存パッケージ導入（ws, zod, vitest）、Git初期化
- [x] Step 1: `plan.md` および `changelog.md` の作成
- [x] Step 2: [TDD Cycle 1] スキーマ駆動の型定義 & セッションエンティティ（Red -> Green -> Refactor -> Commit）
- [x] Step 3: [TDD Cycle 2] PCM音声変換・エンコード/デコード処理（Red -> Green -> Refactor -> Commit）
- [x] Step 4: [TDD Cycle 3] リアルタイム対話プロトコル & 状態マシン（Red -> Green -> Refactor -> Commit）
- [x] Step 5: バックエンド Express + WebSocket + Gemini 3.8 Live API 統合 (`server.ts`)
- [x] Step 6: フロントエンド Web Audio API 音声収録・再生・波形ビジュアライザ・UI実装
- [x] Step 7: 統合テスト & コンパイル検証 (`compile_applet`, `npm run test`)
- [x] Step 8: [TDD Cycle 4] セッション履歴ドメインモデル & リポジトリ実装（Red -> Green -> Refactor -> Commit）
- [x] Step 9: ユーザー発話とGemini応答の時系列チャットUI & セッション切替・永続化実装
- [x] Step 10: [TDD Cycle 5] GitHub Pages (`github.io`) デプロイ対応（Vite base: './' 相対パス、404.html、WebSocket URL自動解決、GitHub Actions CI/CD `deploy.yml`、デプロイ手順書 `DEPLOY_GITHUB_PAGES.md`）
