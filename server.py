"""Serveur local de développement avec sauvegarde atomique de la configuration."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from pathlib import Path
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "Assets" / "Configs" / "runtime.json"
ISS_TLE_PATH = ROOT / "Assets" / "Configs" / "iss-tle.txt"
ISS_TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
ISS_TLE_MAX_AGE = 4 * 60 * 60
LIVE_CLOUDS_URL = "https://clouds.matteason.co.uk/images/8192x4096/clouds-alpha.png"
LIVE_CLOUDS_PATH = ROOT / "Assets" / "Cache" / "live-clouds.png"
LIVE_CLOUDS_MAX_AGE = 3 * 60 * 60
MAX_CLOUD_IMAGE_BYTES = 64 * 1024 * 1024
ADMIN_PASSWORD_SALT = bytes.fromhex("26bf7a54a5a3e3db588e46a135087f04")
ADMIN_PASSWORD_HASH = bytes.fromhex("a1b40c3c1312dc277a137fa57040e2727814abd69f187b86591889adcacb0270")
ADMIN_HASH_ITERATIONS = 600_000
ADMIN_SESSION_SECONDS = 60 * 60
ADMIN_MAX_ATTEMPTS = 5
ADMIN_ATTEMPT_WINDOW = 15 * 60
ADMIN_COOKIE = "astronomy_admin"

admin_sessions = {}
admin_attempts = {}
admin_lock = threading.Lock()


def password_is_valid(password):
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), ADMIN_PASSWORD_SALT, ADMIN_HASH_ITERATIONS
    )
    return hmac.compare_digest(candidate, ADMIN_PASSWORD_HASH)


def prune_admin_state(now):
    for token, expires_at in list(admin_sessions.items()):
        if expires_at <= now:
            admin_sessions.pop(token, None)
    for address, attempts in list(admin_attempts.items()):
        recent = [stamp for stamp in attempts if now - stamp < ADMIN_ATTEMPT_WINDOW]
        if recent:
            admin_attempts[address] = recent
        else:
            admin_attempts.pop(address, None)


def read_iss_tle():
    source = "cache"
    stale = not ISS_TLE_PATH.exists() or time.time() - ISS_TLE_PATH.stat().st_mtime > ISS_TLE_MAX_AGE
    if stale:
        try:
            request = Request(ISS_TLE_URL, headers={"User-Agent": "Astronomy-local/1.0"})
            with urlopen(request, timeout=8) as response:
                text = response.read().decode("utf-8").strip()
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            line1 = next(line for line in lines if line.startswith("1 25544"))
            line2 = next(line for line in lines if line.startswith("2 25544"))
            payload = f"ISS (ZARYA)\n{line1}\n{line2}\n"
            temporary = ISS_TLE_PATH.with_suffix(".tmp")
            temporary.write_text(payload, encoding="utf-8")
            os.replace(temporary, ISS_TLE_PATH)
            source = "CelesTrak"
        except (OSError, StopIteration, UnicodeError):
            source = "cache"
    lines = [line.strip() for line in ISS_TLE_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    line1 = next(line for line in lines if line.startswith("1 25544"))
    line2 = next(line for line in lines if line.startswith("2 25544"))
    return {"name": lines[0], "line1": line1, "line2": line2, "source": source}


def read_live_clouds():
    source = "cache"
    stale = not LIVE_CLOUDS_PATH.exists() or time.time() - LIVE_CLOUDS_PATH.stat().st_mtime > LIVE_CLOUDS_MAX_AGE
    if stale:
        try:
            request = Request(LIVE_CLOUDS_URL, headers={"User-Agent": "Astronomy-local/1.0"})
            with urlopen(request, timeout=30) as response:
                image = response.read(MAX_CLOUD_IMAGE_BYTES + 1)
            if len(image) > MAX_CLOUD_IMAGE_BYTES or len(image) < 100_000 or not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise OSError("Invalid live cloud image")
            LIVE_CLOUDS_PATH.parent.mkdir(parents=True, exist_ok=True)
            temporary = LIVE_CLOUDS_PATH.with_suffix(".tmp")
            temporary.write_bytes(image)
            os.replace(temporary, LIVE_CLOUDS_PATH)
            source = "live"
        except OSError:
            if not LIVE_CLOUDS_PATH.exists():
                raise
    return LIVE_CLOUDS_PATH.read_bytes(), source


class AstronomyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self, maximum_size=1_000_000):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("Invalid content length") from error
        if length <= 0 or length > maximum_size:
            raise ValueError("Invalid request size")
        try:
            return json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ValueError("Invalid JSON") from error

    def client_address_key(self):
        forwarded = self.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
        return forwarded or self.client_address[0]

    def session_token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get("Cookie", ""))
        except Exception:
            return None
        morsel = cookie.get(ADMIN_COOKIE)
        return morsel.value if morsel else None

    def is_admin_authenticated(self):
        token = self.session_token()
        if not token:
            return False
        now = time.time()
        with admin_lock:
            prune_admin_state(now)
            expires_at = admin_sessions.get(token)
            if not expires_at:
                return False
            admin_sessions[token] = now + ADMIN_SESSION_SECONDS
        return True

    def set_admin_cookie(self, token, max_age=ADMIN_SESSION_SECONDS):
        parts = [
            f"{ADMIN_COOKIE}={token}", "Path=/", "HttpOnly", "SameSite=Strict", f"Max-Age={max_age}"
        ]
        if self.headers.get("X-Forwarded-Proto", "").lower() == "https":
            parts.append("Secure")
        self.send_header("Set-Cookie", "; ".join(parts))

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/live-clouds":
            try:
                payload, source = read_live_clouds()
            except OSError:
                self.send_error(503, "Live cloud map unavailable")
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "public, max-age=900")
            self.send_header("X-Cloud-Source", source)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path == "/api/admin/session":
            self.send_json(200, {"authenticated": self.is_admin_authenticated()})
            return
        if self.path == "/api/iss-tle":
            try:
                payload = json.dumps(read_iss_tle(), ensure_ascii=False).encode("utf-8")
            except (OSError, StopIteration) as error:
                self.send_error(503, str(error))
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path == "/api/config":
            try:
                payload = CONFIG_PATH.read_bytes()
            except FileNotFoundError:
                payload = b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/admin/login":
            self.handle_admin_login()
            return
        if self.path == "/api/admin/logout":
            token = self.session_token()
            if token:
                with admin_lock:
                    admin_sessions.pop(token, None)
            self.send_response(204)
            self.set_admin_cookie("", max_age=0)
            self.end_headers()
            return
        if self.path != "/api/config":
            self.send_error(404)
            return
        if not self.is_admin_authenticated():
            self.send_json(401, {"error": "Authentication required"})
            return
        if self.headers.get("X-Astronomy-Admin") != "1":
            self.send_json(403, {"error": "Invalid admin request"})
            return
        try:
            data = self.read_json()
            payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8") + b"\n"
            CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
            temporary = CONFIG_PATH.with_suffix(".tmp")
            temporary.write_bytes(payload)
            os.replace(temporary, CONFIG_PATH)
        except (ValueError, OSError) as error:
            self.send_error(400, str(error))
            return
        self.send_response(204)
        self.end_headers()

    def handle_admin_login(self):
        now = time.time()
        address = self.client_address_key()
        with admin_lock:
            prune_admin_state(now)
            attempts = admin_attempts.get(address, [])
            if len(attempts) >= ADMIN_MAX_ATTEMPTS:
                retry_after = max(1, int(ADMIN_ATTEMPT_WINDOW - (now - attempts[0])))
                self.send_response(429)
                self.send_header("Retry-After", str(retry_after))
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
        try:
            data = self.read_json(maximum_size=4096)
            password = data.get("password", "") if isinstance(data, dict) else ""
        except ValueError:
            password = ""
        if not isinstance(password, str) or not password_is_valid(password):
            with admin_lock:
                admin_attempts.setdefault(address, []).append(now)
            self.send_json(401, {"error": "Invalid credentials"})
            return
        token = secrets.token_urlsafe(32)
        with admin_lock:
            admin_attempts.pop(address, None)
            admin_sessions[token] = now + ADMIN_SESSION_SECONDS
        payload = b'{"authenticated":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.set_admin_cookie(token)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), AstronomyHandler)
    print("Astronomy local: http://127.0.0.1:8000/", flush=True)
    server.serve_forever()
