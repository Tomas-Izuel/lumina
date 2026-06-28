# virtual-tour-service

Servicio multi-tenant de generación asíncrona de virtual tours usando
**Luma Ray 2** en Amazon Bedrock. Diseñado para Propital, Propirent y Orkezto.

## Stack

| Capa | Tecnología |
|------|-----------|
| API de control | FastAPI + Mangum (Lambda + API Gateway, us-west-2) |
| Worker | Lambda SQS FIFO consumer |
| Poller | Lambda EventBridge Scheduler (60s) |
| Webhook dispatcher | Lambda SQS Standard consumer |
| Modelo de video | Luma Ray 2 (`luma.ray-v2:0`, Bedrock us-west-2) |
| Persistencia | Supabase (Postgres 17 + RLS) |
| Colas | SQS FIFO (jobs) + SQS Standard (webhooks) |
| Auth | API key/secret por tenant (bcrypt) |
| Runtime | Python 3.12 |

## Estructura

```
virtual-tour-service/
├── main.py          # Lambda handler — API (Mangum)
├── worker.py        # Lambda handler — SQS worker
├── poller.py        # Lambda handler — EventBridge Scheduler
├── webhook.py       # Lambda handler — Webhook dispatcher
├── src/
│   ├── main.py                    # FastAPI app factory
│   ├── config/settings.py         # Pydantic settings (env vars)
│   ├── db/supabase_client.py      # Cliente Supabase (service role)
│   ├── auth/middleware.py         # Auth: X-API-Key timing-safe
│   ├── observability.py           # JSON logging + CloudWatch metrics
│   ├── routers/
│   │   ├── tours.py               # POST /tours, GET /tours/{id}, upload-urls
│   │   ├── accounts.py            # POST /accounts, /credits
│   │   ├── admin.py               # POST /admin/tenants, /webhooks, /quotas
│   │   └── health.py              # GET /health
│   ├── services/
│   │   ├── tour_service.py        # Lógica de tours + SQS enqueue
│   │   ├── credit_service.py      # Lógica de créditos (RPC Supabase)
│   │   ├── video_backend.py       # Protocol VideoGenerationBackend + LumaRay2
│   │   ├── s3_service.py          # Presigned URLs, HeadObject, upload/download
│   │   └── webhook_service.py     # HMAC, enqueue, log delivery
│   └── schemas/
│       ├── tours.py               # Pydantic v2 request/response de tours
│       ├── accounts.py            # Pydantic v2 de accounts/créditos
│       └── admin.py               # Pydantic v2 de admin
├── tests/                         # pytest + mocks (no infra real requerida)
├── supabase/migrations/           # 7 migraciones SQL (supabase agent — BLOQUE A)
├── docs/aws-infra-setup.md        # Comandos AWS CLI para crear recursos
├── requirements.txt
├── requirements-dev.txt
└── .github/workflows/cd_virtual_tour_service.yml
```

## Desarrollo local

```bash
cd virtual-tour-service
cp .env.example .env   # completar con valores reales
pip install -r requirements-dev.txt

# API local
uvicorn src.main:create_app --factory --reload --port 8010

# Tests (sin infra real — mocks)
pytest tests/ -v
```

## Deploy

Ver `docs/aws-infra-setup.md` para crear los recursos AWS (S3, SQS, Lambda, IAM).
El CD se activa automáticamente con un push a `releases` que afecte este directorio.

## Criterios de aceptación cubiertos

| AC | Cobertura |
|----|-----------|
| AC-1 | Auth middleware X-API-Key + POST /tours retorna en < 1s |
| AC-2 | Pydantic valida min_length=5 en image_s3_keys |
| AC-3 | HeadObject en worker (>10KB, JPEG/PNG) + content_type en presigned URL |
| AC-4 | Early check en API + final check via reserve_credit() en worker |
| AC-5 | confirm_credit_consumption() / release_credit_reservation() atómicas (Supabase RPC) |
| AC-6 | WHERE status='generating' en funciones SQL → idempotencia del poller |
| AC-7 | UNIQUE(tenant_id, idempotency_key) + MessageDeduplicationId SQS FIFO |
| AC-8 | account_id nullable; lógica de crédito condicional |
| AC-9 | GET /tours/{id} con regeneración de presigned URL si vencida |
| AC-10 | HMAC-SHA256, reintentos SQS, DLQ, log en webhook_deliveries |
| AC-11 | tenant_id filter en cada query + RLS Supabase como segunda línea |
| AC-12 | POST /accounts/{id}/credits → assign_credits() RPC |
| AC-13 | credit_ledger + webhook_deliveries + bedrock_cost_usd + CloudWatch metrics |

## Extensión v2

- **Kling backend**: implementar `KlingBackend` en `src/services/video_backend.py`
  y setear `VIDEO_MODEL_BACKEND=kling` → sin cambiar worker ni poller.
- **Billing directo**: agregar `payment_intents` en Supabase; `tenant_quotas` ya existe.
