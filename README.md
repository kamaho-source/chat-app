# Chat App (Next.js + Spring Boot + MySQL)

チームチャット、プロジェクト管理、管理者機能を備えたフルスタックアプリです。  
フロントは Next.js、バックエンドは Spring Boot、DB は MySQL を利用しています。

## 技術スタック
- Frontend: `Next.js 16` / `React 19` / `TypeScript` / `MUI`
- Backend: `Spring Boot 4` / `Java 17` / `Spring Security` / `JPA (Hibernate)`
- DB: `MySQL 8.4`
- Realtime: `WebSocket (STOMP + SockJS)`
- AI: `OpenRouter` (`@AI` メンションで自動返信)
- 実行環境: `Docker Compose`

## ディレクトリ構成
```text
chat-app/
├─ apps/
│  ├─ backend/               # Spring Boot API
│  │  └─ src/main/java/com/example/chat/
│  │     ├─ controller/      # 各REST APIコントローラ
│  │     ├─ service/         # メッセージ/AI/ストレージ処理
│  │     ├─ repository/      # JPAリポジトリ
│  │     ├─ model/           # Entity
│  │     ├─ security/        # 認証/認可フィルタ
│  │     └─ config/          # WebSocket/App設定
│  └─ frontend/              # Next.js App Router
│     ├─ app/                # 画面 (ログイン/チャット/管理等)
│     ├─ components/         # UIコンポーネント
│     ├─ lib/                # APIクライアント等
│     └─ proxy.ts            # 認証リダイレクト + request header付与
├─ scripts/                  # 開発起動スクリプト
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

## 起動方法（推奨: Docker）

### 1) 環境変数を用意
```bash
cp .env.example .env
```

必要に応じて `.env` を編集してください。  
AI を使う場合は `OPENROUTER_API_KEY` が必須です。

### 2) 起動
```bash
docker compose up -d --build
```

### 3) アクセス先
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- WebSocket endpoint: `http://localhost:8000/ws`

### 4) 停止
```bash
docker compose down
```

## ローカル起動（Dockerなし）

### 前提
- Java 17
- Node.js 20+
- MySQL 8+

### 起動
```bash
./scripts/dev-local.sh
```

## 初期ログイン情報（Bootstrap）
`docker-compose.yml` の初期値で管理者ユーザーが作成されます。
- User ID(email): `kid@example.com`
- Password: `password123`
- Role: `ADMIN`

必要なら `docker-compose.yml` の `BOOTSTRAP_*` を変更してください。

## 主な機能
- 認証（ログイン/ログアウト/CSRF）
- チャンネル作成、限定公開、投稿制限
- メッセージ投稿（テキスト/ファイル）
- リアルタイム更新（WS）+ ポーリングフォールバック
- メンション候補表示
- プロジェクト、タスク、プロジェクトファイル管理
- 管理者/マネージャーダッシュボード
- チャンネルの論理削除（`is_active`）
- AI返信（`@AI` を含む投稿で自動応答）

## API一覧（主要）

### 認証・共通
- `GET /api/csrf`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### ユーザー
- `GET /api/users`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}`
- `PATCH /api/users/{id}/role`
- `PATCH /api/users/{id}/status`
- `PATCH /api/users/{id}/password`
- `POST /api/users/{id}/avatar`
- `DELETE /api/users/{id}`

### チャンネル・メッセージ
- `GET /api/channels`
- `GET /api/channels/{id}`
- `POST /api/channels`
- `PATCH /api/channels/{id}`
- `DELETE /api/channels/{id}` (論理削除)
- `PATCH /api/channels/{id}/privacy`
- `GET /api/channels/{id}/members`
- `POST /api/channels/{id}/members`
- `PATCH /api/channels/{id}/members/{memberId}`
- `DELETE /api/channels/{id}/members/{memberId}`
- `GET /api/channels/{id}/messages`
- `POST /api/channels/{id}/messages`
- `PATCH /api/messages/{id}`

### プロジェクト
- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PATCH /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/projects/{id}/members`
- `POST /api/projects/{id}/members`
- `PATCH /api/projects/{id}/members/{memberId}`
- `DELETE /api/projects/{id}/members/{memberId}`
- `GET /api/projects/{id}/channels`
- `POST /api/projects/{id}/channels`
- `DELETE /api/projects/{id}/channels/{linkId}`
- `GET /api/projects/{id}/messages`
- `POST /api/projects/{id}/messages`
- `GET /api/projects/{id}/files`
- `POST /api/projects/{id}/files`
- `DELETE /api/projects/{id}/files/{fileId}`
- `GET /api/projects/{id}/tasks`
- `POST /api/projects/{id}/tasks`

### 管理
- `GET /api/admin/stats`

## OpenRouter設定

`.env` に設定してください（`.env.example` あり）。

```env
OPENROUTER_ENABLED=true
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-120b:free
```

反映:
```bash
docker compose up -d --build backend
```

## よく使うコマンド
- 全体起動: `docker compose up -d --build`
- バックエンドだけ再起動: `docker compose restart backend`
- フロントだけ再起動: `docker compose restart frontend`
- ログ確認: `docker compose logs -f backend`

## 注意事項
- `.env` は機密情報を含むため Git 管理しません（`.gitignore` 済み）。
- 共有用には `.env.example` を使ってください。
