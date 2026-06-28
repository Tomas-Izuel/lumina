"""
Servicio S3: presigned URLs, validación de objetos, descarga/subida de clips.
Satisface: AC-2 (presigned upload), AC-3 (HeadObject anti-alucinación),
           AC-5 (descarga clips para ffmpeg), AC-13 (output upload).
"""

import logging
import os
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Tamaño mínimo de imagen (10KB) — validación anti-alucinación (AC-3)
MIN_IMAGE_SIZE_BYTES = 10_240

# Content-types aceptados para imágenes
VALID_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png"}


class S3Service:
    def __init__(self) -> None:
        settings = get_settings()
        self._region = settings.aws_region
        self._upload_bucket = settings.s3_upload_bucket
        self._output_bucket = settings.s3_output_bucket
        self._s3 = boto3.client("s3", region_name=self._region)

    # -------------------------------------------------------------------------
    # Presigned URLs para upload (B-5)
    # -------------------------------------------------------------------------

    def generate_upload_presigned_urls(
        self,
        tenant_id: str,
        content_types: list[str],
        expiry_seconds: int = 900,  # 15 minutos
    ) -> list[dict]:
        """
        Genera N presigned PUT URLs para que el tenant suba imágenes directamente a S3.
        Las claves siguen el patrón: uploads/{tenant_id}/{batch_uuid}/img_{n}.{ext}
        (AC-3: content-type validado en upload URL → solo JPEG/PNG pasan a S3)
        """
        batch_id = str(uuid4())
        results = []

        for i, content_type in enumerate(content_types):
            ext = "jpg" if content_type == "image/jpeg" else "png"
            s3_key = f"uploads/{tenant_id}/{batch_id}/img_{i:03d}.{ext}"

            url = self._s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._upload_bucket,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiry_seconds,
            )

            results.append(
                {
                    "url": url,
                    "s3_key": s3_key,
                    "expires_in_seconds": expiry_seconds,
                }
            )

        return results

    # -------------------------------------------------------------------------
    # Validación anti-alucinación (B-6, AC-3)
    # -------------------------------------------------------------------------

    def validate_image_key(self, s3_key: str) -> tuple[bool, str]:
        """
        Valida una imagen via HeadObject:
        - ContentLength > 10KB (MIN_IMAGE_SIZE_BYTES)
        - ContentType es JPEG o PNG
        Retorna (is_valid, reason).
        """
        try:
            head = self._s3.head_object(Bucket=self._upload_bucket, Key=s3_key)
        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            if code in ("404", "NoSuchKey"):
                return False, f"Imagen no encontrada en S3: {s3_key}"
            return False, f"Error S3 al validar imagen: {code}"

        content_length = head.get("ContentLength", 0)
        content_type = head.get("ContentType", "")

        if content_length < MIN_IMAGE_SIZE_BYTES:
            return (
                False,
                f"Imagen demasiado pequeña ({content_length} bytes < {MIN_IMAGE_SIZE_BYTES}). "
                "Sube una imagen válida.",
            )

        # Aceptar también subtypes (ej: image/jpeg; charset=utf-8)
        base_ct = content_type.split(";")[0].strip().lower()
        if base_ct not in VALID_IMAGE_CONTENT_TYPES:
            return (
                False,
                f"Content-type inválido '{content_type}'. Solo se aceptan JPEG y PNG.",
            )

        return True, ""

    # -------------------------------------------------------------------------
    # Descarga de clips (B-7 poller)
    # -------------------------------------------------------------------------

    def download_image_as_base64(self, s3_key: str) -> str:
        """Descarga una imagen del bucket de upload y retorna base64."""
        import base64

        response = self._s3.get_object(Bucket=self._upload_bucket, Key=s3_key)
        data = response["Body"].read()
        return base64.b64encode(data).decode("utf-8")

    def download_clip_to_tmp(self, s3_key: str, local_path: str) -> None:
        """Descarga un clip de video del bucket de output a /tmp/."""
        self._s3.download_file(self._output_bucket, s3_key, local_path)

    # -------------------------------------------------------------------------
    # Upload del video final (B-7 poller)
    # -------------------------------------------------------------------------

    def upload_final_video(self, local_path: str, s3_key: str) -> None:
        """Sube el video concatenado final al bucket de output."""
        self._s3.upload_file(
            local_path,
            self._output_bucket,
            s3_key,
            ExtraArgs={"ContentType": "video/mp4"},
        )
        logger.info("Video final subido a S3", extra={"s3_key": s3_key})

    # -------------------------------------------------------------------------
    # Presigned URL del video final (B-4 GET /tours, B-7 poller)
    # -------------------------------------------------------------------------

    def generate_video_presigned_url(self, s3_key: str, expiry_seconds: int = 86400) -> str:
        """Genera presigned GET URL para el video final. Expiry: 24h por defecto."""
        return self._s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._output_bucket, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )
