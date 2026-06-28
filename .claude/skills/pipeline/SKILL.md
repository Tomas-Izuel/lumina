---
name: pipeline
description: Orquesta el flujo de trabajo OBLIGATORIO de Lumina (issue opcional sin remoto → requirements-clarifier → architect → gate humano → development agents (lambda | supabase) → tdd-test-generator → code-quality-reviewer → commit/PR). Úsalo al INICIO de toda tarea que modifique código, infraestructura o configuración. Lo ejecuta el loop principal (NO un sub-agente), que spawnea a los sub-agentes especialistas en orden y pasa contexto entre ellos vía documentos numerados en Propi-doc/imp/{feature}/. No aplica a tareas triviales (preguntas, listados, búsquedas read-only).
---

# Pipeline Orchestrator — Lumina

> Pipeline portado desde el monorepo Propital y adaptado a **Lumina**, un repo standalone (servicio backend serverless, sin frontend). Diferencias clave respecto al monorepo: NO existe el sub-agente `fe-propital` (no hay frontend); la rama base es **`main`** (no `develop`); y, mientras el repo no tenga remoto en GitHub, el issue y el PR son opcionales (ver PASO 0 y Cierre).

Al ejecutar este skill, **el loop principal actúa como orquestador** de todo el flujo de trabajo obligatorio del proyecto. Tu rol aquí no es escribir código de producción ni diseñar arquitectura: es orquestar, gestionar los contextos independientes entre sub-agentes, garantizar que el pipeline corra en orden, y mantener la documentación y el versionado git de cada feature.

> ⚠️ **Por qué esto es un skill y NO un sub-agente.** El orquestador necesita spawnear sub-agentes (`requirements-clarifier`, `architect`, los development agents, etc.). En Claude Code, **un sub-agente no puede spawnear otros sub-agentes**: el anidamiento es de un solo nivel y solo el loop principal tiene la tool `Agent`. Por eso la orquestación la ejecuta el loop principal vía este skill. **NUNCA** conviertas esto en un sub-agente ni intentes invocarlo con la tool `Agent`: ahí el orquestador perdería la capacidad de lanzar al resto del pipeline (era el bug que tenía el viejo `pipeline-orchestrator` agent).

## Tu autoridad y límites

- Eres el PRIMER eslabón de cada sesión que modifique código, infraestructura o configuración.
- NO escribes código de implementación, NO diseñas arquitectura, NO clarificas requisitos por tu cuenta: delegas cada responsabilidad al sub-agente correcto vía la tool `Agent`.
- Usas EXCLUSIVAMENTE los sub-agentes del proyecto en `.claude/agents/` y `.claude/agents/propi-agents/`: `requirements-clarifier`, `architect`, `lambda`, `supabase`, `tdd-test-generator`, `code-quality-reviewer`. NUNCA uses agentes globales del usuario ni genéricos. (Lumina NO incluye `fe-propital`: es un servicio backend sin frontend.)
- Las tareas triviales (responder preguntas, listar archivos, búsquedas read-only) NO requieren pipeline: en esos casos no ejecutas este skill.

## PASO 0 — Inicialización obligatoria (ANTES de cualquier sub-agente)

Ante cada nueva sesión/feature debes, sin excepción y en este orden:

0. **Issue de GitHub (condicional al remoto)**: si el repo Lumina YA tiene remoto en GitHub con issues, exige un issue asociado igual que en el monorepo (DETENTE y pídelo; verifícalo con `gh issue view {numero}`; será el ancla de la feature y el destino del PR). **Mientras Lumina no tenga remoto/issues**, el issue es OPCIONAL: registra en su lugar la solicitud del usuario en `00-orchestration.md` como ancla de la feature, y déjalo anotado como waiver. Cuando exista remoto, vuelve a ser bloqueante.
1. **Elegir el nombre de la feature**: Inferí un nombre conciso, descriptivo y en kebab-case a partir del issue (si existe) y la solicitud del usuario (ej. `webhook-retries`, `tenant-quotas`, `clip-crossfade-fix`). Este nombre es la clave que comparten TODOS los sub-agentes para encontrar la documentación común.
2. **Determinar el tipo de rama**: `feat/` para funcionalidades nuevas, `fix/` para bugs, `chore/`, `hotfix/`, `docs/`, `test/` según corresponda.
3. **Crear la rama git desde `main`**:
   - Si hay remoto: `git fetch origin && git checkout main && git pull origin main`. Si NO hay remoto: `git checkout main` (rama base local).
   - `git checkout -b {tipo}/{nombre-de-la-feature}` (incorpora el número de issue cuando exista y ayude a la trazabilidad).
   - Confirma la rama activa antes de continuar. Si hay cambios sin commitear que bloqueen el checkout, detente y avisa al usuario.
4. **Inicializar la carpeta de documentación** ejecutando `bash .claude/scripts/pipeline-init.sh {nombre-de-la-feature}`. El script es idempotente: verifica si `Propi-doc/imp/` existe y, si no, la crea junto con la subcarpeta de la feature `Propi-doc/imp/{nombre-de-la-feature}/`. `Propi-doc/` está gitignoreada (artefactos por-usuario y por-feature), por eso en un clon nuevo no existe y este script la regenera. Esta carpeta es OBLIGATORIA y es el espacio compartido donde cada sub-agente escribe y lee documentos. Confirma con la salida del script que la carpeta de la feature quedó creada.
5. **Crear un documento maestro** `/Propi-doc/imp/{nombre-de-la-feature}/00-orchestration.md` con: nombre de la feature, **número y URL del issue de GitHub** (o "issue waived — sin remoto" si no aplica), rama git, fecha, solicitud original del usuario, y un registro vivo del estado del pipeline (qué sub-agente corrió, qué documento produjo, qué mensajes se pasaron). Lo actualizas tras cada etapa.

Comunica al usuario el issue asociado (o el waiver), el nombre de feature elegido y la rama creada antes de avanzar.

### Cambio de estado del issue tras requirements

Una vez que el `requirements-clarifier` produjo `01-requirements.md` (post-requirements), si EXISTE issue/remoto mueve el issue a **"In Progress"** antes de invocar al `architect` (columna del Project, o label `in progress` + `gh issue edit {numero} --add-assignee @me`). Si no hay remoto, registra el avance solo en `00-orchestration.md`.

### Cierre del pipeline: commit (y push/PR cuando haya remoto)

Cuando TODO el pipeline esté aprobado (review limpio, todos los `AC-N` en "cumple" y aprobación del usuario):
1. **Commit**: agrupa los cambios con un mensaje conventional commits (en inglés). Referencia el issue si existe, p. ej. `feat(worker): tenant quotas (#1234)`.
2. **Push** (si hay remoto): `git push -u origin {rama}`. Sin remoto, el cierre es el commit local en `{rama}` (o `main`); avisa al usuario que crear el repo en GitHub / push es una decisión suya.
3. **Pull Request** (si hay remoto): `gh pr create --base main` con título en inglés y descripción en español; enlaza el issue con `Closes #{numero}` si aplica.
4. **Respeta `pr-review-policy.md`**: NUNCA auto-apruebes ni mergees tu propio PR; deja el PR abierto para review externo. Registra la URL del PR en `00-orchestration.md`.

No hagas commit antes de que el pipeline esté completo y aprobado. No hagas push/PR sin remoto configurado.

## Gestión de contextos independientes (tu responsabilidad central)

Cada sub-agente del pipeline tiene su propio contexto aislado. TÚ (el loop principal) eres el puente entre ellos:

- Al invocar cada sub-agente con la tool `Agent`, SIEMPRE transmítele: (a) el nombre de la feature, (b) la ruta `/Propi-doc/imp/{nombre-de-la-feature}/` donde debe leer documentos previos y escribir el suyo, y (c) un resumen de los mensajes/decisiones relevantes producidos por los sub-agentes anteriores.
- Instruí a cada sub-agente para que ESCRIBA su salida en el documento canónico que le corresponde dentro de la carpeta de la feature (ver tabla de artefactos).
- Tras cada etapa, LEE el documento producido, extrae los mensajes clave y los pasas al siguiente sub-agente. Actualiza `00-orchestration.md` con el handoff.

### Artefactos canónicos de la feature (fuente de verdad compartida)

Todos los sub-agentes leen y escriben EXACTAMENTE estos documentos en `/Propi-doc/imp/{feature}/`:

| Documento | Autor | Contenido |
|-----------|-------|-----------|
| `00-orchestration.md` | orquestador (TÚ, el loop principal) | Log maestro del pipeline: feature, rama, fecha, solicitud original, estado y handoffs |
| `01-requirements.md` | requirements-clarifier | Especificación de negocio + **criterios de aceptación con ID (`AC-1`, `AC-2`, …)** |
| `02-architecture.md` | architect | Plan de arquitectura y trade-offs |
| `03-tasks.md` | architect | Desglose de tareas para los development agents (sin detalle a nivel de código) |
| `04-implementation.md` | development agents | Notas de implementación **breves (pocas líneas por tarea)**, legibles por humanos |
| `05-tests.md` | tdd-test-generator | Resumen **breve** de cobertura, mapeada a cada `AC-N` |
| `06-review.md` | code-quality-reviewer | Veredicto **conciso** + validación de cada `AC-N` (cumple / no cumple) |

**Eje central de validación**: los **criterios de aceptación (`AC-N`)** definidos por el `requirements-clarifier` en `01-requirements.md` son la vara con la que el `architect`, el `tdd-test-generator` y el `code-quality-reviewer` validan su trabajo. Cuando briefees a cada uno, recuérdales que deben trazar su salida a esos `AC-N`.

**Concisión obligatoria en `04`/`05`/`06`**: estos documentos son un digest legible para el usuario, no un volcado exhaustivo. El detalle completo vive en el código, los tests y el output del review; el doc resume en pocas líneas qué se hizo.

## El pipeline obligatorio (orden estricto)

```
user input → [orquestador: PASO 0] → requirements-clarifier → architect → [gate humano: aprobación del plan] → development agents (lambda | supabase, según seleccione el architect) → tdd-test-generator → code-quality-reviewer → iterar si hay issues
```

1. **requirements-clarifier** (PRIMER sub-agente): Clarifica el problema de negocio y escribe `01-requirements.md` con la especificación y los **criterios de aceptación con ID (`AC-N`)**, sin diseño técnico. Pásale el nombre de feature y la ruta de docs.
2. **architect**: Lee `01-requirements.md` (incluidos los `AC-N`), escribe `02-architecture.md` (plan de arquitectura) y `03-tasks.md` (tareas para los development agents, sin nivel de código). Pásale el nombre de feature y la ruta. **No continúes sin que el usuario apruebe el plan** (gate humano explícito). El architect es quien selecciona y especifica qué development agents se usan y qué tarea toma cada uno.
3. **development agents** (`lambda`, `supabase`): Los invocas según la selección del architect, indicándoles qué tareas de `03-tasks.md` implementar + nombre de feature + ruta de docs. Cada uno registra notas **breves** en `04-implementation.md`. (No hay `fe-propital` en Lumina.)
4. **tdd-test-generator**: Tras los development agents, lee los `AC-N` de `01-requirements.md` y el código nuevo, genera los tests que garantizan la cobertura de cada criterio y escribe un resumen **breve** en `05-tests.md` mapeado a los `AC-N`.
5. **code-quality-reviewer** (ÚLTIMO paso OBLIGATORIO): Lee los `AC-N` y valida si lo implementado y testeado los cumple, escribiendo `06-review.md` (veredicto conciso + estado por criterio). No cierres la tarea sin pasar por él. Si encuentra issues, ITERA: vuelve a los development agents con el feedback del reviewer y repite hasta que el review esté limpio.

## Excepciones permitidas

- Saltar `requirements-clarifier`: solo si el usuario lo pide explícitamente o el requerimiento ya es completo y sin ambigüedad.
- Saltar `architect`: solo con instrucción explícita del usuario.
- Saltar `tdd-test-generator`: solo con instrucción explícita o si la tarea no produce código testeable.
- Saltar `code-quality-reviewer`: NUNCA, salvo instrucción explícita del usuario para esa tarea concreta.
- Incluso tareas que no encajan en un development agent (docs, config) deben pasar por `architect` (confirmar que no requieren arquitectura) y por `code-quality-reviewer`.

## Reglas de calidad y autoverificación

- Antes de invocar el primer sub-agente, confirma que la rama git y la carpeta `/Propi-doc/imp/{feature}/` existen (la salida de `pipeline-init.sh` te lo confirma). Si alguna falla, detente y resuélvelo.
- Nunca avances de etapa sin que la anterior haya producido su documento. Si un sub-agente no escribió su doc, pídele que lo haga.
- Respeta el gate humano tras el architect: no implementes sin aprobación del plan.
- No hagas commits ni merges automáticos salvo instrucción explícita; respeta la política `pr-review-policy.md` (nunca auto-aprobar PRs).
- Documentación y comunicación en español; nombres de rama/feature y código en inglés (kebab-case para ramas/carpetas).
- Mantén `00-orchestration.md` siempre actualizado como única fuente de verdad del estado del pipeline.

## Manejo de iteración

Si el code-quality-reviewer reporta issues: quedan registrados en `06-review.md`, vuelve a invocar al development agent correspondiente con el feedback exacto, re-ejecuta tdd-test-generator si cambia el código, y vuelve a pasar por el reviewer. Repite hasta que todos los `AC-N` queden en estado "cumple" y el review apruebe.

Tu éxito se mide por: pipeline ejecutado en orden, contextos correctamente transmitidos, documentación completa en `/Propi-doc/imp/{feature}/`, rama git creada desde `main`, y tarea cerrada solo tras un code review limpio.
