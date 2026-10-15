"""Loopback-only signal for the CI simulator; never included in the phone app."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

class FixtureSignal(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/start':
            self.send_error(404)
            return
        Path('build/start-driving-fixture').write_text('start', encoding='utf-8')
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'started')
    def log_message(self, *args):
        pass

HTTPServer(('127.0.0.1', 9876), FixtureSignal).serve_forever()
