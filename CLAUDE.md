# CLAUDE.md — Lumina

Guía para asistentes de IA y developers al trabajar en **Lumina**. Lumina es un servicio **autónomo, multi-tenant** (repo independiente, fuera del monorepo Propital) que recibe varias fotos de una propiedad (mínimo ~5) y genera de forma asíncrona un video tipo **recorrido virtual**, usando Amazon Bedrock (modelo **Luma Ray 2**, interpolación con keyframes inicio+fin entre ambientes consecutivos). Lo consumen Propital, Propirent, Orkezto y, a futuro, proveedores externos.

> Codename del proyecto: **Lumina** (nodo a la luz/visión y guiño al modelo Luma que lo potencia).

## ⚠️ FLUJO DE TRABAJO OBLIGATORIO (SIN EXCEPCIONES)

**Esta es la regla más importante del repo. TODA sesión de Claude que modifique código, infraestructura o configuración DEBE iniciar con la skill `/pipeline`, ejecutada por el LOOP PRINCIPAL (no un sub-agente). SIEMPRE usar los AGENTES DEL PROYECTO (`.claude/agents/` y `.claude/agents/propi-agents/`), NUNCA los agentes globales del usuario ni genéricos.**

Este pipeline está portado del monorepo Propital y **adaptado a Lumina**. Diferencias clave:
- **No existe `fe-propital`** (Lumina es backend puro, sin frontend). Los development agents son solo **`lambda`** y **`supabase`**.
- **Rama base = `main`** (no `develop`).
- **Issue de GitHub: opcional mientras el repo no tenga remoto.** Cuando exista remoto/issues, el issue vuelve a ser bloqueante (como en el monorepo). Sin remoto, la solicitud del usuario en `00-orchestration.md` es el ancla de la feature.

### Pipeline obligatorio para CADA tarea

```
0. (issue de GitHub si hay remoto; si no, waiver registrado)
        ↓
1. user input
        ↓
2. skill /pipeline (LOOP PRINCIPAL)  ← crea rama desde main, la carpeta Propi-doc/imp/{feature}/
   (vía .claude/scripts/pipeline-init.sh), el doc maestro 00-orchestration.md, y orquesta todo
        ↓
3. requirements-clarifier  → 01-requirements.md (spec + criterios de aceptación AC-1, AC-2, …)
        ↓ (los AC-N son la vara de validación de architect, tdd y reviewer)
4. architect  → 02-architecture.md (plan + trade-offs) y 03-tasks.md (tareas a nivel funcional)
        ↓
5. user aprueba el plan  ← gate humano, no continuar sin aprobación
        ↓
6. development agents implementan 03-tasks.md (notas breves en 04-implementation.md):
   - lambda    → backend serverless AWS (FastAPI Lambdas, SQS, EventBridge, Step Functions, Bedrock)
   - supabase  → SQL, migraciones, RLS, funciones atómicas, Auth/Storage si aplica
        ↓
7. tdd-test-generator  → cubre cada AC-N con tests (pytest); resumen en 05-tests.md
        ↓
8. code-quality-reviewer  → valida cada AC-N; veredicto en 06-review.md  ← OBLIGATORIO antes de cerrar
        ↓
9. iterar si el reviewer encuentra issues
        ↓
10. al aprobar TODO → orquestador: commit (y push/PR a main con "Closes #issue" SOLO si hay remoto)
```

> **Artefactos compartidos** en `/Propi-doc/imp/{feature}/`: `00-orchestration.md` (orquestador), `01-requirements.md` (clarifier, con los `AC-N`), `02-architecture.md` + `03-tasks.md` (architect), `04-implementation.md` (dev agents), `05-tests.md` (tdd), `06-review.md` (reviewer). `04`/`05`/`06` son resúmenes BREVES. `Propi-doc/` está gitignoreada.

### Reglas estrictas del pipeline
- **SIEMPRE iniciar con `/pipeline`** (la ejecuta el loop principal; un sub-agente no puede spawnear otros).
- **NUNCA implementar sin un plan aprobado por el usuario** (gate humano tras el architect).
- **`code-quality-reviewer` es OBLIGATORIO** como último paso; no se cierra una tarea sin pasar por él.
- **Cierre**: solo con review limpio, todos los `AC-N` en "cumple" y aprobación del usuario. Respeta `.claude/rules/pr-review-policy.md` (nunca auto-aprobar ni mergear el propio PR).
- **Sub-agentes válidos** (EXCLUSIVOS): `requirements-clarifier`, `architect`, `lambda`, `supabase`, `tdd-test-generator`, `code-quality-reviewer`.

### Excepciones permitidas
- **Saltar `requirements-clarifier`**: solo si el usuario lo pide o el requerimiento ya es completo y sin ambigüedad.
- **Saltar `architect`**: solo con instrucción explícita.
- **Saltar `tdd-test-generator`**: solo con instrucción explícita o si la tarea no produce código testeable.
- **Saltar `code-quality-reviewer`**: nunca, salvo instrucción explícita para esa tarea.
- **Tareas triviales** (preguntas, listados, búsquedas read-only): no requieren pipeline.

## Principios de Idioma
- Documentación y comunicación: **español**. Código (variables, funciones, archivos), nombres de rama/feature y commits: **inglés** (conventional commits). PRs: descripción en español, títulos en inglés.

## Stack Tecnológico
- **Cómputo**: AWS Lambda (Python 3.12), FastAPI + Mangum para la API, handlers separados para worker/poller/webhook.
- **IA / generación de video**: Amazon Bedrock — modelo **Luma Ray 2** (`luma.ray-v2:0`, región **us-west-2**), `start_async_invoke` / `get_async_invoke`, keyframes `frame0`+`frame1` (interpolación entre fotos consecutivas). Abstracción `VideoGenerationBackend` para poder cambiar de modelo (Kling/Veo) sin reescribir el pipeline.
- **Orquestación asíncrona**: SQS FIFO (jobs), EventBridge Scheduler (poller cada 60s), SQS (webhooks), ffmpeg (Lambda layer) para concatenar clips con cross-fade.
- **Persistencia**: **Supabase** (Postgres + RLS para aislamiento multi-tenant; PgBouncer; funciones SQL atómicas para créditos). Las Lambdas usan service role.
- **Auth**: API key/secret por tenant (bcrypt, timing-safe). Notificación: webhook firmado HMAC-SHA256 con reintentos.
- **Infra/CI**: AWS (S3, SQS, EventBridge, IAM, CloudWatch), GitHub Actions (`.github/workflows/cd_lumina.yml`).

## Estructura del repo

Este repositorio es un monorepo. El backend del servicio vive en `lumina/`.
Las apps de cara al público (landing, web app) están en `landing/` y `web/`
como placeholders para la visión v2.

```
(raíz del monorepo)/
├── lumina/                      # backend serverless Python
│   ├── main.py / worker.py / poller.py / webhook.py   # 4 entry points Lambda (mismo ZIP, handlers distintos)
│   ├── src/
│   │   ├── main.py                  # FastAPI app + routers
│   │   ├── config/settings.py       # settings desde entorno (sin valores mágicos)
│   │   ├── db/supabase_client.py
│   │   ├── auth/middleware.py       # API key por tenant (bcrypt, timing-safe)
│   │   ├── routers/                 # tours, accounts, admin, health
│   │   ├── services/                # tour, credit, bedrock/video_backend, s3, ffmpeg, webhook
│   │   └── schemas/                 # Pydantic v2
│   ├── supabase/migrations/*.sql    # migraciones versionadas (forward-only)
│   ├── tests/                       # pytest + mocks (sin recursos cloud reales)
│   ├── docs/aws-infra-setup.md      # recursos AWS a crear + deploy
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── landing/                     # placeholder — sitio de marketing (v2)
│   └── README.md
├── web/                         # placeholder — web app SaaS (v2)
│   └── README.md
├── .github/workflows/cd_lumina.yml
├── .claude/                     # pipeline (gobierna todo el monorepo)
├── Propi-doc/                   # artefactos del pipeline por feature (gitignored)
├── CLAUDE.md
└── README.md
```

Convención de layout: cada app vive en una carpeta hermana en la raíz (`lumina/`, `landing/`, `web/`). Sin gestor de workspaces por ahora — cada app es autónoma con sus propias dependencias.

## Reglas Operativas Clave
- **No modificar/crear `.env`** sin confirmación. Usar `.env.example` como referencia; sin secrets en código ni en logs.
- **Sin valores hardcode/mágicos**: constantes nombradas o leídas de `settings`. (Ej.: el precio de Bedrock vive en env, no en código.)
- **No introducir tecnologías nuevas** si existe patrón vigente. Si es imprescindible, justificar y documentar.
- **Cambios quirúrgicos**; archivos de código **≤350 líneas** (descomponer por responsabilidad).
- **Multi-tenancy**: cada query/endpoint debe respetar el aislamiento por `tenant_id`; RLS es la segunda línea de defensa.
- **Atomicidad crédito↔resultado**: nunca descontar crédito por un tour fallido ni entregar doble por un crédito. Usar las funciones SQL atómicas (`reserve_credit`, `confirm_credit_consumption`, `release_credit_reservation`) + claim atómico del poller (`generating→finalizing`).

## Visión de producto: v1 (interno) → v2 (SaaS para terceros)
- **v1 (actual)**: Lumina es **infraestructura interna** del grupo. Las apps consumidoras (Propital, Propirent, Orkezto) otorgan créditos a sus cuentas y consumen vía API. NO se cobra dinero; el billing es un **punto de extensión limpio**, no construido aún.
- **v2 (roadmap)**: Lumina como **app/SaaS propia** vendida a inmobiliarias y proveedores externos, con **planes de suscripción** medidos en dos dimensiones:
  - 🎬 **Generación**: videos por mes (ej. plan Starter = 2 videos/mes). Mapea a `tenant_quotas.max_tours_per_month`.
  - 💾 **Almacenamiento**: cantidad de videos guardados disponibles (ej. Starter = 8 videos). Requiere un contador de almacenamiento por cuenta + lifecycle S3 por plan (nuevo en v2).
  - La **descarga siempre está permitida** (entrega por link S3); se monetiza por *cuánto generás* y *cuánto retenés* → para más videos/almacenamiento, **upgrade de plan**.
- **Lo que ya habilita v2 sin reescribir el core**: multi-tenancy + RLS, cuotas y trazabilidad de costo por tenant (desde v1), backend de modelo **pluggable** (calidad/costo por tier), y el billing como punto de extensión.
- **Lo que v2 agrega** (no implementar sin pasar por el pipeline): tabla de planes/suscripciones + enforcement a nivel plan, contador de almacenamiento + retención por plan, integración de pago (Stripe/Fintoc), portal de autogestión y frontend propio. Detalle de presentación en `demo.md` § "Visión v2".

## Política de Migraciones SQL (DDL vs DML, forward-only)
Las migraciones en `lumina/supabase/migrations/` corren contra Postgres y son **propiedad del desarrollo, atadas a un cambio de esquema o de código**.
- **Forward-only**: NUNCA editar una migración ya entregada. Para cambiar algo, crear una migración nueva numerada (ej. la 008 agregó el estado `finalizing` y `CREATE OR REPLACE` de funciones, sin tocar la 007).
- **SÍ van como migración**: DDL (`CREATE`/`ALTER` de tablas, índices, constraints, funciones, RLS) y data migrations atadas a un cambio de código (backfills, normalizaciones).
- **NO van como migración**: toggles/ediciones puntuales de filas por decisión operativa sin código asociado (activar un tenant, asignar créditos a mano). Eso es trabajo de un control de backoffice/admin, no de una migración. Mientras no exista ese control, cualquier mutación manual en prod queda como registro auditable fuera de `migrations/`.

## Ejecución y Testing local
- **Tests**: `cd lumina && python -m pytest` (mocks de AWS/Supabase/ffmpeg; no requiere recursos reales). Mantener la suite en verde antes de cerrar.
- **API local** (opcional): `cd lumina && uvicorn src.main:app --reload --port 8080` con las env vars de `.env`.
- **Deploy**: ver `lumina/docs/aws-infra-setup.md` (habilitar Luma Ray 2 en Bedrock Model Access + confirmar precio, crear proyecto Supabase + `supabase db push`, crear S3/SQS/EventBridge/IAM + layer ffmpeg, configurar secrets de GitHub Actions).

## Convenciones de Nombrado
| Contexto | Convención | Ejemplo |
|----------|------------|---------|
| Variables/funciones Python | snake_case | `is_active`, `reserve_credit` |
| Clases | PascalCase | `LumaRay2BedrockBackend` |
| Constantes | UPPER_SNAKE_CASE | `CLIP_DURATION_SECS` |
| Archivos de documentación | kebab-case | `aws-infra-setup.md` |
| Ramas | `tipo/kebab-case` | `feat/tenant-quotas` |
| Recursos AWS / colas / buckets | prefijo `lumina-` | `lumina-inputs`, `lumina-jobs.fifo` |

## Política Anti-Alucinación
- No asumir dependencias, rutas o tecnologías ausentes del árbol del repo. Confirmar existencia de archivos antes de referenciarlos.
- Si falta información crítica, preguntar o remitir a las fuentes de verdad: este `CLAUDE.md`, los agentes en `.claude/`, `docs/`, y el código fuente.

## Agentes y Skill (referencia)
- **Skill orquestadora**: `.claude/skills/pipeline/SKILL.md` (`/pipeline`).
- **Sub-agentes**: `.claude/agents/{requirements-clarifier,tdd-test-generator}.md` y `.claude/agents/propi-agents/{architect,lambda,supabase,code-quality-reviewer}.md`.
- **Scripts**: `.claude/scripts/pipeline-init.sh`.
- **Reglas**: `.claude/rules/pr-review-policy.md`.
