"""
Logging estructurado JSON y métricas CloudWatch.
Satisface: AC-13 (trazabilidad por tenant), B-11.

Todas las Lambdas importan este módulo para configurar logging JSON
y emitir métricas custom al namespace VirtualTourService.
"""

import json
import logging
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

from src.config.settings import get_settings

# Namespace CloudWatch para el servicio
CLOUDWATCH_NAMESPACE = "VirtualTourService"


class JsonFormatter(logging.Formatter):
    """
    Formatter que emite logs como JSON estructurado.
    Compatible con CloudWatch Logs Insights para queries por tenant_id / tour_id.
    No incluye datos sensibles (secrets, tokens, paths de usuario).
    """

    SERVICE_NAME = "virtual-tour-service"

    def format(self, record: logging.LogRecord) -> str:
        base = {
            "timestamp": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "service": self.SERVICE_NAME,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Agregar campos extra del record (tenant_id, tour_id, etc.)
        for key, value in record.__dict__.items():
            if key not in {
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "message", "module",
                "msecs", "msg", "name", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName",
            }:
                base[key] = value

        if record.exc_info:
            base["exception"] = self.formatException(record.exc_info)

        return json.dumps(base, default=str)


def configure_logging(component: str) -> None:
    """
    Configura el root logger con JsonFormatter.
    Llamar una vez por Lambda handler al inicializar.
    """
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Reemplazar handlers existentes (Lambda ya tiene uno por defecto)
    if root_logger.handlers:
        root_logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)

    logging.getLogger(__name__).info(
        "Logging configurado",
        extra={"component": component, "log_level": settings.log_level},
    )


class CloudWatchMetrics:
    """
    Emite métricas custom al namespace VirtualTourService.
    Satisface AC-13: trazabilidad de costo y uso por tenant.

    Métricas emitidas:
    - ToursAccepted (dim: TenantId)
    - ToursCompleted (dim: TenantId)
    - ToursFailed (dim: TenantId)
    - TourCostUsd (dim: TenantId)
    - WebhookDeliverySuccess (dim: TenantId)
    - WebhookDeliveryFailed (dim: TenantId)
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._cw = boto3.client("cloudwatch", region_name=settings.aws_region)
        self._logger = logging.getLogger(__name__)

    def _put(
        self, metric_name: str, value: float, unit: str, tenant_id: str
    ) -> None:
        try:
            self._cw.put_metric_data(
                Namespace=CLOUDWATCH_NAMESPACE,
                MetricData=[
                    {
                        "MetricName": metric_name,
                        "Value": value,
                        "Unit": unit,
                        "Dimensions": [{"Name": "TenantId", "Value": tenant_id}],
                    }
                ],
            )
        except ClientError as exc:
            # No debe fallar el procesamiento principal
            self._logger.warning(
                "Error emitiendo métrica CloudWatch",
                extra={"metric": metric_name, "error": str(exc)},
            )

    def tour_accepted(self, tenant_id: str) -> None:
        self._put("ToursAccepted", 1.0, "Count", tenant_id)

    def tour_completed(self, tenant_id: str, cost_usd: float) -> None:
        self._put("ToursCompleted", 1.0, "Count", tenant_id)
        self._put("TourCostUsd", cost_usd, "None", tenant_id)

    def tour_failed(self, tenant_id: str) -> None:
        self._put("ToursFailed", 1.0, "Count", tenant_id)

    def webhook_success(self, tenant_id: str) -> None:
        self._put("WebhookDeliverySuccess", 1.0, "Count", tenant_id)

    def webhook_failed(self, tenant_id: str) -> None:
        self._put("WebhookDeliveryFailed", 1.0, "Count", tenant_id)
