"""
Tests de la abstracción VideoGenerationBackend.
Cubre: factory, payload Luma Ray 2, extensibilidad (B-6, AC-3).
"""

import os
import pytest
from unittest.mock import MagicMock, patch


def test_factory_returns_luma_ray2_backend():
    """VIDEO_MODEL_BACKEND=luma_ray2 → LumaRay2BedrockBackend."""
    from src.services.video_backend import LumaRay2BedrockBackend, get_video_backend

    with patch("src.services.video_backend.boto3"):
        backend = get_video_backend()
    assert isinstance(backend, LumaRay2BedrockBackend)


def test_factory_raises_for_unknown_backend(monkeypatch):
    """Backend no implementado → NotImplementedError."""
    monkeypatch.setenv("VIDEO_MODEL_BACKEND", "kling")

    from src.config.settings import get_settings
    get_settings.cache_clear()

    from src.services.video_backend import get_video_backend
    with pytest.raises(NotImplementedError, match="kling"):
        get_video_backend()

    # Restaurar
    monkeypatch.setenv("VIDEO_MODEL_BACKEND", "luma_ray2")
    get_settings.cache_clear()


def test_luma_ray2_start_clip_builds_correct_payload():
    """
    Verifica que start_clip llama start_async_invoke con keyframes.frame0 y frame1.
    Esta es la estructura crítica para first+last frame conditioning.
    """
    from src.services.video_backend import LumaRay2BedrockBackend

    mock_bedrock = MagicMock()
    mock_bedrock.start_async_invoke.return_value = {"invocationArn": "arn:aws:bedrock:us-west-2::async-invoke/test123"}

    with patch("boto3.client", return_value=mock_bedrock):
        backend = LumaRay2BedrockBackend()

    backend._bedrock = mock_bedrock

    ref = backend.start_clip(
        frame_start_base64="base64_start",
        frame_end_base64="base64_end",
        prompt="camera moves forward",
        output_s3_prefix="tours/t1/t2/clip_000",
        clip_index=0,
    )

    assert ref.invocation_arn == "arn:aws:bedrock:us-west-2::async-invoke/test123"
    assert ref.backend == "luma_ray2"

    call_kwargs = mock_bedrock.start_async_invoke.call_args.kwargs
    model_input = call_kwargs["modelInput"]

    # Verificar estructura keyframes first+last
    assert "keyframes" in model_input
    assert "frame0" in model_input["keyframes"]
    assert "frame1" in model_input["keyframes"]
    assert model_input["keyframes"]["frame0"]["source"]["data"] == "base64_start"
    assert model_input["keyframes"]["frame1"]["source"]["data"] == "base64_end"
    assert model_input["duration"] == "9s"
    assert model_input["aspect_ratio"] == "16:9"


def test_luma_ray2_get_clip_status_completed():
    """get_clip_status en estado Completed → retorna output_s3_key."""
    from src.services.video_backend import ClipInvocationRef, LumaRay2BedrockBackend

    mock_bedrock = MagicMock()
    mock_bedrock.get_async_invoke.return_value = {
        "status": "Completed",
        "outputDataConfig": {
            "s3OutputDataConfig": {"s3Uri": "s3://lumina-outputs/tours/t1/t2/clip_000"}
        },
    }

    with patch("boto3.client", return_value=mock_bedrock):
        backend = LumaRay2BedrockBackend()
    backend._bedrock = mock_bedrock
    backend._output_bucket = "lumina-outputs"

    ref = ClipInvocationRef(invocation_arn="arn:test", backend="luma_ray2")
    status = backend.get_clip_status(ref)

    assert status.state == "Completed"
    assert status.output_s3_key == "tours/t1/t2/clip_000/output.mp4"


def test_webhook_signature_hmac():
    """AC-10: firma HMAC-SHA256 tiene el formato correcto."""
    from src.services.webhook_service import WebhookService

    with patch("src.services.webhook_service.get_supabase"), \
         patch("src.services.webhook_service.boto3"):
        svc = WebhookService()

    sig = svc.compute_signature('{"tour_id":"abc"}', "my-secret")
    assert sig.startswith("sha256=")
    assert len(sig) == 7 + 64  # "sha256=" + 64 hex chars
