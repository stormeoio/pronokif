from __future__ import annotations

import csv
import io
import json
from typing import Any

from fastapi.responses import Response


def csv_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list, tuple, set)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def csv_response(filename: str, rows: list[dict], columns: list[tuple[str, str]]) -> Response:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[key for key, _label in columns])
    writer.writerow({key: label for key, label in columns})
    for row in rows:
        writer.writerow({key: csv_value(row.get(key)) for key, _label in columns})
    return Response(
        content="\ufeff" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
