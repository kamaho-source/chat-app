# ローカル・本番環境 両対応 設定ガイド

## 構成概要

| 環境 | フロントURL | バックエンドCORS |
|---|---|---|
| ローカル | `http://localhost:3000` | `http://localhost:3000` を許可 |
| 本番 | `https://kamaho-chat.kazuyukitech.com` | `https://kamaho-chat.kazuyukitech.com` を許可 |

---

## 1. application.yml（1ファイルで環境切り替え）

`---` で区切ることで1ファイル内にプロファイルをまとめています。

- **local プロファイル**: `http://localhost:3000` を CORS で許可
- **production プロファイル**: `https://kamaho-chat.kazuyukitech.com` を CORS で許可
- **forward-headers-strategy: framework**: Cloudflare Tunnel経由のHTTPS認識に必要

---

## 2. CORS設定（Java / Spring Boot）

`SecurityConfig.java` では `appProperties.getSecurity().getFrontendOrigin()` を使用して、
プロファイルに応じたCORS設定を動的に適用します。

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(appProperties.getSecurity().getFrontendOrigin()));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

## 3. フロントエンド（TypeScript / Next.js）

環境ごとに `.env` ファイルを切り替えて、APIのURLを変更します。

### ローカル環境（.env）

```env
SPRING_PROFILE=local
NEXT_PUBLIC_API_BASE=
```

### 本番環境（.env）

```env
SPRING_PROFILE=production
NEXT_PUBLIC_API_BASE=https://kamaho-chat.kazuyukitech.com
```

### API呼び出し箇所（lib/api.ts）

```ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",  // クッキー送信に必要
    ...init,
  });
  // ...
}
```

---

## 4. docker-compose.yml

環境変数を `.env` から動的に読み込むように設定しています。

```yaml
services:
  backend:
    environment:
      - SPRING_PROFILE=${SPRING_PROFILE:-local}

  frontend:
    environment:
      - NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE:-}
```

---

## 5. 環境切り替え方法

### ローカル環境で起動

```bash
# .env を確認
cat .env
# SPRING_PROFILE=local
# NEXT_PUBLIC_API_BASE=

# Docker Compose で起動
docker-compose up
```

### 本番環境で起動

```bash
# .env を本番設定に変更
SPRING_PROFILE=production
NEXT_PUBLIC_API_BASE=https://kamaho-chat.kazuyukitech.com

# Docker Compose で起動
docker-compose up
```

または、`.env.production.example` をコピーして使用:

```bash
cp .env.production.example .env
# 必要に応じて .env を編集
docker-compose up
```

---

## ポイントまとめ

- ✅ `application.yml` は `---` で区切り **1ファイルにまとめる**
- ✅ コードにURLをハードコードせず **すべて環境変数で管理する**
- ✅ `forward-headers-strategy: framework` で **Cloudflare Tunnel経由のHTTPSを正しく認識させる**
- ✅ `credentials: "include"` を忘れると **クッキーがクロスオリジンで送れない**
- ✅ 環境切り替えは **`.env` ファイルの `SPRING_PROFILE` を変更するだけ**

---

## トラブルシューティング

### CORS エラーが発生する場合

1. `SPRING_PROFILE` が正しく設定されているか確認
2. バックエンドのログで `frontend-origin` の値を確認
3. ブラウザのコンソールで実際のリクエストヘッダーを確認

### クッキーが送信されない場合

1. フロントエンドで `credentials: "include"` が設定されているか確認
2. CORS設定で `allowCredentials: true` が設定されているか確認
3. `same-site: lax` の設定を確認

### 本番環境でHTTPSが認識されない場合

1. `forward-headers-strategy: framework` が設定されているか確認
2. Cloudflare Tunnel の設定を確認
3. リバースプロキシが `X-Forwarded-Proto` ヘッダーを送信しているか確認
