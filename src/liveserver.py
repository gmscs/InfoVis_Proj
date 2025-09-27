import http.server
import socketserver
import sys

Handler = http.server.SimpleHTTPRequestHandler
PORT = 5550

if len(sys.argv) > 1:
    PORT = int(sys.argv[1])

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Live server at http://localhost:{PORT}")
        print("Quit with Ctrl + C")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nKilling server")
