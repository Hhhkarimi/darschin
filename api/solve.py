from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any

from api.cp_sat_solver import solve_payload
from api.payload_validation import MAX_BODY_BYTES


class handler(BaseHTTPRequestHandler):
    server_version = "DarschinSolver/1.0"

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Allow", "POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/solve":
            self._send_json(404, {"error": "مسیر پیدا نشد."})
            return
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self._send_json(415, {"error": "فقط application/json پذیرفته می‌شود."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Content-Length نامعتبر است."})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(413, {"error": "حجم درخواست باید کمتر از ۲ مگابایت باشد."})
            return
        try:
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "JSON معتبر نیست."})
            return
        try:
            result = solve_payload(payload)
        except Exception:
            # Do not leak model or user data through error details.
            self._send_json(500, {"error": "حل دقیق با خطای داخلی متوقف شد.", "retryWithFast": True})
            return
        self._send_json(200, result)
