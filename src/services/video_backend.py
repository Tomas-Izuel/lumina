"""
Abstracción de backend de generación de video.
Satisface: AC-3 (generación), AC-5 (async invocación), punto de extensión v2 (Kling).

El worker y el poller solo dependen de VideoGenerationBackend (Protocol).
Agregar Kling en v2 = crear KlingBackend; sin cambiar worker ni poller.

Selección en runtime vía env var VIDEO_MODEL_BACKEND:
  - luma_ray2 (default) → LumaRay2BedrockBackend
  - kling → KlingBackend (v2, no implementado aún)
"""

import json
import logging
from dataclasses import dataclass
from typing import Protocol

import boto3

from src.config.settings import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types compartidos
# ---------------------------------------------------------------------------


@dataclass
class ClipInvocationRef:
    """Referencia opaca a una invocación asíncrona de generación de video."""

    invocation_arn: str
    backend: str  # "luma_ray2" | "kling"


@dataclass
class ClipStatus:
    """Estado de una invocación de video."""

    invocation_arn: str
    state: str  # "InProgress" | "Completed" | "Failed"
    output_s3_key: str | None = None  # path al clip generado si Completed
    failure_message: str | None = None


# ---------------------------------------------------------------------------
# Protocol — interfaz abstracta
# ---------------------------------------------------------------------------


class VideoGenerationBackend(Protocol):
    """
    Interfaz para backends de generación de video image-to-video.
    Permite swap de Luma Ray 2 → Kling (u otro) en v2 sin reescribir
    el worker ni el poller (AC-3 satisfecho a través de implementaciones concretas).
    """

    def start_clip(
        self,
        frame_start_base64: str,
        frame_end_base64: str,
        prompt: str,
        output_s3_prefix: str,
        clip_index: int,
    ) -> ClipInvocationRef:
        """Lanza una invocación async para generar un clip entre dos frames."""
        ...

    def get_clip_status(self, ref: ClipInvocationRef) -> ClipStatus:
        """Consulta el estado de una invocación async."""
        ...


# ---------------------------------------------------------------------------
# Implementación: Luma Ray 2 en Amazon Bedrock (v1 default)
# ---------------------------------------------------------------------------

# Aspecto de ratio del video — 16:9 para recorridos de propiedad
_ASPECT_RATIO = "16:9"


class LumaRay2BedrockBackend:
    """
    Backend de generación de video usando Luma Ray 2 en Amazon Bedrock.
    Modelo: luma.ray-v2:0, región us-west-2.
    Soporta first+last frame conditioning (keyframes.frame0 + frame1).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._model_id = settings.bedrock_model_id
        self._region = settings.bedrock_region
        self._output_bucket = settings.s3_output_bucket
        self._duration = f"{settings.clip_duration_secs}s"
        # Cliente bedrock-runtime en us-west-2 (sin cross-region)
        self._bedrock = boto3.client(
            "bedrock-runtime",
            region_name=self._region,
        )

    def start_clip(
        self,
        frame_start_base64: str,
        frame_end_base64: str,
        prompt: str,
        output_s3_prefix: str,
        clip_index: int,
    ) -> ClipInvocationRef:
        """
        Lanza una invocación start_async_invoke con first+last frame.
        Retorna inmediatamente con el invocationArn (AC-3, AC-5).

        Payload Luma Ray 2 con keyframes.frame0 y frame1:
        https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-luma.html
        """
        body = {
            "prompt": prompt,
            "keyframes": {
                "frame0": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": frame_start_base64,
                    },
                },
                "frame1": {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": frame_end_base64,
                    },
                },
            },
            "duration": self._duration,
            "aspect_ratio": _ASPECT_RATIO,
        }

        s3_output_config = {
            "s3OutputDataConfig": {
                "s3Uri": f"s3://{self._output_bucket}/{output_s3_prefix}"
            }
        }

        logger.info(
            "Iniciando invocación Luma Ray 2",
            extra={
                "model_id": self._model_id,
                "clip_index": clip_index,
                "output_prefix": output_s3_prefix,
            },
        )

        response = self._bedrock.start_async_invoke(
            modelId=self._model_id,
            modelInput=body,
            outputDataConfig=s3_output_config,
        )

        invocation_arn = response["invocationArn"]
        logger.info(
            "Invocación Luma Ray 2 iniciada",
            extra={"invocation_arn": invocation_arn, "clip_index": clip_index},
        )

        return ClipInvocationRef(
            invocation_arn=invocation_arn,
            backend="luma_ray2",
        )

    def get_clip_status(self, ref: ClipInvocationRef) -> ClipStatus:
        """
        Consulta el estado de una invocación con get_async_invoke.
        Estados posibles: InProgress | Completed | Failed.
        """
        response = self._bedrock.get_async_invoke(invocationArn=ref.invocation_arn)
        state = response.get("status", "InProgress")

        output_s3_key: str | None = None
        if state == "Completed":
            # El output está en el prefijo configurado; Bedrock escribe output.mp4
            output_config = response.get("outputDataConfig", {})
            s3_uri = output_config.get("s3OutputDataConfig", {}).get("s3Uri", "")
            # Convertir s3://bucket/prefix → prefix/output.mp4
            if s3_uri.startswith(f"s3://{self._output_bucket}/"):
                prefix = s3_uri[len(f"s3://{self._output_bucket}/"):]
                output_s3_key = f"{prefix.rstrip('/')}/output.mp4"

        failure_message: str | None = None
        if state == "Failed":
            failure_message = response.get("failureMessage", "Luma Ray 2 generation failed")

        return ClipStatus(
            invocation_arn=ref.invocation_arn,
            state=state,
            output_s3_key=output_s3_key,
            failure_message=failure_message,
        )


# ---------------------------------------------------------------------------
# Factory — selección de backend vía env var
# ---------------------------------------------------------------------------


def get_video_backend() -> VideoGenerationBackend:
    """
    Retorna el backend activo según VIDEO_MODEL_BACKEND.
    Punto de extensión para v2: agregar KlingBackend sin cambiar llamadores.
    """
    settings = get_settings()
    backend = settings.video_model_backend.lower()

    if backend == "luma_ray2":
        return LumaRay2BedrockBackend()

    # Extensión v2: KlingBackend (no implementado aún)
    raise NotImplementedError(
        f"Backend '{backend}' no implementado. "
        "Opciones disponibles: luma_ray2. "
        "Para Kling en v2: implementar KlingBackend y registrarlo aquí."
    )
