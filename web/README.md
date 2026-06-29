# web

Portal de autogestión SaaS de Lumina.

## Proposito

Web app para consumidores externos en la vision SaaS v2 de Lumina. Portal de
autogestión para tenants externos: generacion de tours, visualizacion y descarga
de videos, gestion de creditos e historial de uso.

Sera el punto de entrada para inmobiliarias y brokers que contraten el servicio
directamente (sin integracion API propia), permitiendoles subir fotos, iniciar
la generacion del virtual tour y gestionar su plan de suscripcion.

## Stack previsto

Por definir. Probablemente Next.js / React. Esta carpeta es un placeholder.

## Estado

Placeholder — pendiente de construccion. Esta carpeta reserva el lugar en el
monorepo para el portal SaaS de la vision v2.

## Convencion de monorepo

Las apps del monorepo Lumina viven en carpetas hermanas en la raiz del repositorio:
`lumina/` (backend), `landing/` (sitio de marketing), `web/` (portal SaaS).
Cada app es autonoma con sus propias dependencias. No hay gestor de workspaces
compartido por el momento.
