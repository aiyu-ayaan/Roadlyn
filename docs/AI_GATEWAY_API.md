# Roadlyn AI Gateway API

The API exposes OpenAPI documentation at `/docs` and a machine-readable spec through the Fastify Swagger integration. AI provider API keys are never read from `.env`; they are encrypted with AES-256-GCM and stored in PostgreSQL through `ProviderAPIKey`.

## Authentication

Create an OAuth2 client:

```http
POST /api/auth/oauth-clients
Content-Type: application/json

{
  "name": "Dashboard Admin",
  "scopes": ["ai:read", "ai:write", "ai:admin"]
}
```

Exchange the returned one-time `clientSecret` for a bearer token:

```http
POST /api/auth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "rlyn_xxx",
  "client_secret": "secret_xxx",
  "scope": "ai:read ai:write"
}
```

Use the returned `access_token` as `Authorization: Bearer <token>` for AI gateway routes.

## Provider Flow

1. `POST /api/ai/providers` registers metadata such as provider type, base URL, streaming/vision support, and enabled state.
2. `POST /api/ai/models` registers provider models and capability/pricing metadata.
3. `POST /api/ai/keys` stores an encrypted global or user-owned key.
4. `POST /api/ai/test-provider` validates the selected provider/model/key without restarting the backend.
5. `POST /api/ai/default-provider` and `POST /api/ai/default-model` persist per-user defaults and fallback providers.

## Dynamic Generation

Roadmap generation can select explicit provider/model IDs:

```http
POST /api/roadmaps/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "AI Engineering",
  "providerId": "provider_xxx",
  "modelId": "model_xxx"
}
```

Or use per-user defaults:

```http
POST /api/roadmaps/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Cybersecurity",
  "useUserDefaults": true
}
```
