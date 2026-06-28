#!/usr/bin/env bash
# ============================================================================
# pipeline-init.sh — Inicializa la estructura de documentación del pipeline.
#
# Lo ejecuta el orquestador (loop principal, skill /pipeline) en el PASO 0, antes de invocar a cualquier
# sub-agente. Es idempotente: verifica si la carpeta existe y, si no, la crea
# (incluyendo `imp/` adentro).
#
# La carpeta `Propi-doc/` está gitignoreada (artefactos de trabajo por-usuario y
# por-feature), por lo que en un clon nuevo no existe. Este script la regenera.
#
# Uso:
#   bash .claude/scripts/pipeline-init.sh [nombre-de-feature]
#     - Sin argumento: garantiza que exista `Propi-doc/imp/`.
#     - Con argumento: garantiza además `Propi-doc/imp/{nombre-de-feature}/`.
# ============================================================================
set -euo pipefail

# Resolver la raíz del repo para funcionar desde cualquier directorio actual.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BASE_DIR="$REPO_ROOT/Propi-doc/imp"

if [ ! -d "$BASE_DIR" ]; then
  mkdir -p "$BASE_DIR"
  echo "✓ Estructura base creada: Propi-doc/imp/"
else
  echo "✓ Estructura base ya existe: Propi-doc/imp/"
fi

FEATURE="${1:-}"
if [ -n "$FEATURE" ]; then
  FEATURE_DIR="$BASE_DIR/$FEATURE"
  if [ ! -d "$FEATURE_DIR" ]; then
    mkdir -p "$FEATURE_DIR"
    echo "✓ Carpeta de feature creada: Propi-doc/imp/${FEATURE}/"
  else
    echo "✓ Carpeta de feature ya existe: Propi-doc/imp/${FEATURE}/"
  fi
fi
