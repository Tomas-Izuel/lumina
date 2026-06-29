"""
Entry point Lambda — API de control.
Handler: main.handler
Runtime: Python 3.12, Mangum v0.19.

Satisface: AC-1, AC-2, AC-4, AC-7, AC-8, AC-9, AC-11, AC-12.

Importa de forma lazy para minimizar cold start.
"""

from src.observability import configure_logging

# Configurar logging estructurado JSON antes de cualquier import de FastAPI
configure_logging("api")

from mangum import Mangum  # noqa: E402

from src.main import create_app  # noqa: E402

# Instancia de FastAPI — reutilizada entre invocaciones (warm start)
_app = create_app()

# Mangum adapta el evento API Gateway → ASGI → FastAPI
handler = Mangum(_app, lifespan="off")
