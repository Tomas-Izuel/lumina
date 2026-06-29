"""
Servicio de concatenación de video con ffmpeg.
Usado por el poller para unir N-1 clips con cross-fade.
El binario ffmpeg viene del Lambda layer (/opt/bin/ffmpeg).
"""

import logging
import os
import subprocess

logger = logging.getLogger(__name__)

# Binario ffmpeg del Lambda layer
FFMPEG_BIN = os.environ.get("FFMPEG_BIN", "/opt/bin/ffmpeg")

# Cross-fade en segundos entre clips
CROSSFADE_DURATION = 0.3


def concat_clips(clip_paths: list[str], output_path: str, clip_duration_secs: int) -> None:
    """
    Concatena N clips de video con cross-fade usando ffmpeg xfade filter.
    Escribe el resultado en output_path (en /tmp).

    Para un solo clip: copia directamente (sin filtro).
    Para N > 1: encadena xfade transitions de CROSSFADE_DURATION segundos.
    """
    n = len(clip_paths)

    if n == 0:
        raise ValueError("No hay clips para concatenar")

    if n == 1:
        subprocess.run(
            [FFMPEG_BIN, "-i", clip_paths[0], "-c", "copy", output_path, "-y"],
            check=True,
            capture_output=True,
        )
        return

    inputs: list[str] = []
    for path in clip_paths:
        inputs += ["-i", path]

    # Construir filter_complex xfade encadenado
    # Ejemplo para 3 clips: [0:v][1:v]xfade=...:offset=8.7[v01];[v01][2:v]xfade=...:offset=17.4[v012]
    filter_parts: list[str] = []
    prev_label = "[0:v]"
    for i in range(1, n):
        offset = i * clip_duration_secs - CROSSFADE_DURATION
        out_label = f"[v{''.join(str(j) for j in range(i + 1))}]"
        filter_parts.append(
            f"{prev_label}[{i}:v]xfade=transition=fade:"
            f"duration={CROSSFADE_DURATION}:offset={offset:.3f}{out_label}"
        )
        prev_label = out_label

    filter_complex = ";".join(filter_parts)

    cmd = (
        [FFMPEG_BIN]
        + inputs
        + [
            "-filter_complex", filter_complex,
            "-map", prev_label,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            output_path,
            "-y",
        ]
    )

    logger.info(
        "Ejecutando ffmpeg concat",
        extra={"clips": n, "output": output_path},
    )

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error("ffmpeg falló", extra={"stderr": result.stderr[-2000:]})
        raise RuntimeError(f"ffmpeg concat failed: {result.stderr[-500:]}")

    logger.info("ffmpeg concat exitoso", extra={"output": output_path})
