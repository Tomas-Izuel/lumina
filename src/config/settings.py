"""
Configuración central del servicio.
Lee todas las variables de entorno y expone un singleton `settings`.
Ningún módulo hardcodea valores — siempre importa desde aquí.
"""

import os
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # AWS / S3
    aws_region: str = "us-west-2"
    s3_upload_bucket: str = "lumina-inputs"
    s3_output_bucket: str = "lumina-outputs"

    # SQS
    tour_jobs_queue_url: str = ""
    webhook_queue_url: str = ""

    # Bedrock — Luma Ray 2
    bedrock_region: str = "us-west-2"
    bedrock_model_id: str = "luma.ray-v2:0"
    bedrock_price_per_second: float = 1.50
    clip_duration_secs: int = 9
    video_resolution: str = "720p"
    video_model_backend: str = "luma_ray2"

    # Generación
    tour_generation_timeout_minutes: int = 25
    min_images_per_tour: int = 5
    max_images_per_tour: int = 11  # 10 clips × 9s = 90s máx
    presigned_url_expiry_seconds: int = 3600  # 1 hora para subida
    video_presigned_url_expiry_seconds: int = 86400  # 24 horas para video final

    # Admin
    admin_api_key: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"

    # Auth — last_used_at throttle.
    # Bajo Mangum+Lambda, FastAPI BackgroundTasks ejecuta ANTES de que se envíe
    # la response (no es verdaderamente async). Para evitar un write a Supabase
    # en cada request, se limita la escritura a una vez por ventana de tiempo.
    last_used_at_throttle_minutes: int = 5

    @field_validator("clip_duration_secs")
    @classmethod
    def validate_clip_duration(cls, v: int) -> int:
        if v not in (5, 9):
            raise ValueError("CLIP_DURATION_SECS debe ser 5 o 9")
        return v

    model_config = {"env_file": ".env", "case_sensitive": False}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
