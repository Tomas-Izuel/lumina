# Politica de Pull Requests y Reviews

## Regla principal: NO auto-aprobacion

NUNCA aprobar un PR donde el usuario actual es el autor. Esta es una regla critica del equipo.

## Reglas de ejecucion

### Al crear o revisar PRs
- NUNCA ejecutar `gh pr review --approve` si el usuario actual (ver `gh api user --jq '.login'`) es el autor del PR
- Antes de aprobar cualquier PR, SIEMPRE verificar que el reviewer NO es el autor con: `gh pr view <PR> --json author --jq '.author.login'`
- Si el usuario pide aprobar su propio PR, RECHAZAR la solicitud y explicar la politica

### Al hacer merge
- Antes de ejecutar `gh pr merge`, SIEMPRE verificar que el PR tiene al menos 1 aprobacion de alguien que NO sea el autor
- Verificar con: `gh pr view <PR> --json reviews --jq '[.reviews[] | select(.state == "APPROVED" and .author.login != "<autor>")] | length'`
- Si no hay aprobacion externa, RECHAZAR el merge y sugerir solicitar review de otro developer

### Usuarios exentos
- `jaimeguzman` (email: me@jguzman.cl), `rochaldo` (email: francisco@propital.com) son los unico usuarios exentos de estas restricciones
- Puede aprobar sus propios PRs y hacer merge directo a ramas criticas

### Ramas protegidas
- `develop`, `releases`, `main`, `master` requieren merge via PR con aprobacion externa
- Solo `jaimeguzman` puede hacer push directo a estas ramas
- Ramas de feature/fix/chore: push libre para todos

### Respuesta ante violaciones
Si un developer intenta auto-aprobar o hacer merge sin review:
1. Bloquear la accion
2. Explicar: "La politica del equipo requiere al menos 1 aprobacion de otro developer"
3. Sugerir: "Solicita review de: DouglasCruz912, camilafernandez2, AngelVDev, GuillermoBravo-dev, o rochaldo"
