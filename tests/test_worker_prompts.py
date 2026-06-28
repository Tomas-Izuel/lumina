"""
Tests de generación de prompts de cámara en el worker.
Cubre: B-6 (prompts N-1, primer par, último par, pares intermedios).
"""

from worker import _build_default_prompts


def test_build_default_prompts_5_images():
    """5 imágenes → 4 prompts."""
    prompts = _build_default_prompts(5)
    assert len(prompts) == 4


def test_build_default_prompts_first_is_entry():
    """Primer prompt debe describir entrada al inmueble."""
    prompts = _build_default_prompts(5)
    assert "entering" in prompts[0].lower() or "dolly" in prompts[0].lower()


def test_build_default_prompts_last_is_reveal():
    """Último prompt debe describir revelación del espacio final."""
    prompts = _build_default_prompts(5)
    assert "final" in prompts[-1].lower() or "reveals" in prompts[-1].lower()


def test_build_default_prompts_min_images():
    """Mínimo: 5 imágenes → exactamente 4 prompts."""
    prompts = _build_default_prompts(5)
    assert len(prompts) == 4


def test_build_default_prompts_max_images():
    """Máximo: 11 imágenes → exactamente 10 prompts."""
    prompts = _build_default_prompts(11)
    assert len(prompts) == 10
    assert "entering" in prompts[0].lower() or "dolly" in prompts[0].lower()
    assert "final" in prompts[-1].lower() or "reveals" in prompts[-1].lower()
