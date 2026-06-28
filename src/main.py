"""
FastAPI application factory.
Registra todos los routers y configura el logging estructurado.
"""

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.routers import accounts, admin, health, tours

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Virtual Tour Service",
        description=(
            "Servicio multi-tenant de generación asíncrona de virtual tours "
            "usando Luma Ray 2 en Amazon Bedrock. "
            "Diseñado para Propital, Propirent y Orkezto (v1)."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Routers
    app.include_router(health.router)
    app.include_router(tours.router)
    app.include_router(accounts.router)
    app.include_router(admin.router)

    # Handler global de errores de validación Pydantic (respuesta consistente)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            errors.append(
                {
                    "field": ".".join(str(loc) for loc in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )
        return JSONResponse(
            status_code=422,
            content={"detail": "Error de validación", "errors": errors},
        )

    return app
