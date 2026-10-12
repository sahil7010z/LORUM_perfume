#!/usr/bin/env python3
import functools, http.server, socketserver, os

PROJECT = os.path.dirname(os.path.abspath(__file__))
PORT = 8000

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class Server(socketserver.TCPServer):
    allow_reuse_address = True

Handler = functools.partial(H, directory=PROJECT)

if __name__ == '__main__':
    with Server(('', PORT), Handler) as httpd:
        print(f'AURUM serving {PROJECT} at http://localhost:{PORT} (no-store)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
