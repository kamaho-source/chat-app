# Chat App (Next.js + Spring Boot)

## 起動方法

```bash
cd /Users/oohashikazuyuki/chat-app

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- WebSocket (SockJS): http://localhost:8000/ws

## 主なAPI

- CSRF初期化: `GET /api/csrf`
- 認証: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- ユーザー: `GET /api/users`, `GET /api/users/{id}`, `PATCH /api/users/{id}`
- チャンネル: `GET /api/channels`, `POST /api/channels`, `PATCH /api/channels/{id}`
- メッセージ: `GET /api/channels/{id}/messages`, `POST /api/channels/{id}/messages`
- プロジェクト: `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/{id}`
- プロジェクトメンバー: `GET /api/projects/{id}/members`
- プロジェクトファイル: `GET /api/projects/{id}/files`, `POST /api/projects/{id}/files`
- タスク: `GET /api/projects/{id}/tasks`, `POST /api/projects/{id}/tasks`
- 管理統計: `GET /api/admin/stats`

## OpenRouter連携

`.env` か `docker-compose.yml` で以下を設定してください。

- `OPENROUTER_ENABLED=true`
- `OPENROUTER_API_KEY=...`
- `OPENROUTER_MODEL=openrouter/auto`

`@AI` を含むメッセージが投稿されると自動返信します。
# chat-app
