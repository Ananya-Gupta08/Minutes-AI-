"""Real Uvicorn/socket/restart smoke test using an isolated temporary database."""
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def run():
    checks = 0
    def check(condition, label):
        nonlocal checks
        assert condition, label
        checks += 1

    with tempfile.TemporaryDirectory(prefix='minutes-ai-http-') as directory:
        db_path = Path(directory) / 'smoke.db'
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        env = {**os.environ, 'DATABASE_URL': 'sqlite:///' + db_path.as_posix(),
               'CORS_ORIGINS': 'https://audit.example', 'SEED_DEMO': 'true',
               'PYTHONPATH': os.pathsep.join(sys.path)}
        server = None
        log = open(Path(directory) / 'server.log', 'w+', encoding='utf-8')

        def request(path, method='GET', body=None, headers=None):
            data = json.dumps(body).encode() if body is not None else None
            req = Request(base + path, data=data, method=method,
                          headers={'Content-Type':'application/json', **(headers or {})})
            try:
                response = urlopen(req, timeout=10)
            except HTTPError as exc:
                response = exc
            with response:
                content = response.read()
                parsed = json.loads(content) if content and 'application/json' in response.headers.get('content-type', '') else content
                return response.status, parsed, response.headers

        def stop():
            nonlocal server
            if server is not None:
                server.terminate()
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=10)
                server = None

        def start():
            nonlocal server
            # Bypass Windows' venv launcher so terminate() targets the server itself.
            server = subprocess.Popen([getattr(sys, '_base_executable', sys.executable), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(port)],
                cwd=Path(__file__).resolve().parents[1], env=env, stdout=log, stderr=log,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            for _ in range(150):
                try:
                    if request('/api/health')[0] == 200:
                        return
                except (URLError, ConnectionError, TimeoutError):
                    pass
                if server.poll() is not None:
                    break
                time.sleep(0.1)
            log.flush(); log.seek(0)
            raise AssertionError('Uvicorn failed to start: ' + log.read())

        try:
            start()
            status, library, _ = request('/api/meetings')
            check(status == 200 and library['total'] == 5, 'five seeded meetings over HTTP')
            check(request('/docs')[0] == 200, 'interactive docs')
            check('/api/meetings/{meeting_id}' in request('/openapi.json')[1]['paths'], 'OpenAPI routes')
            for meeting in library['meetings']:
                detail = request(f"/api/meetings/{meeting['id']}")[1]
                check(len(detail['segments']) == 20 and len(detail['chapters']) == 4, 'seed transcript and chapters')
            for origin, expected in [('https://audit.example',200), ('http://localhost:3000',400)]:
                status, _, headers = request('/api/meetings', 'OPTIONS', headers={'Origin':origin, 'Access-Control-Request-Method':'POST'})
                check(status == expected, 'environment-controlled CORS status')
                check(headers.get('Access-Control-Allow-Origin') == (origin if expected == 200 else None), 'CORS origin header')
            check(request('/api/search?q=anonymized')[1]['total'] == 1, 'transcript search')
            check(request('/api/meetings?participant=Maya%20Patel&topic=Design')[1]['total'] == 1, 'combined filters')
            check(request('/api/meetings?sort=invalid')[0] == 422, 'query validation')
            check(request('/api/meetings/999999')[0] == 404, 'missing meeting')
            payload = dict(title='HTTP persistence proof', meeting_date='2026-09-07T09:00:00Z', duration_seconds=30,
                           raw_transcript='Ananya: We agreed to ship.\nAlex: I will send notes.', participants=['Ananya'], tags=['Audit'])
            status, meeting, _ = request('/api/meetings', 'POST', payload)
            check(status == 201 and len(meeting['participants']) == 2, 'meeting creation')
            mid = meeting['id']
            check(request(f'/api/meetings/{mid}', 'PATCH', {'title':'Edited HTTP proof','tags':['Audit','Persisted']})[0] == 200, 'metadata update')
            status, action, _ = request(f'/api/meetings/{mid}/action-items', 'POST', {'text':'Persist task', 'assignee':'Ananya','due_date':'2026-09-10'})
            check(status == 201, 'action creation')
            check(request(f"/api/action-items/{action['id']}", 'PATCH', {'text':'Persist edited task','completed':True})[1]['completed'], 'action editing/completion')
            stop(); start()
            persisted = request(f'/api/meetings/{mid}')[1]
            check(persisted['title'] == 'Edited HTTP proof', 'meeting survives process restart')
            check(any(a['id'] == action['id'] and a['completed'] and a['text'] == 'Persist edited task' for a in persisted['action_items']), 'task survives process restart')
            check(request(f"/api/action-items/{action['id']}", 'DELETE')[0] == 204, 'action deletion')
            check(request(f'/api/meetings/{mid}', 'DELETE')[0] == 204, 'meeting deletion')
            with sqlite3.connect(db_path) as db:
                for table in ['transcript_segments','topics','chapters','action_items','meeting_participants']:
                    check(db.execute(f'SELECT COUNT(*) FROM {table} WHERE meeting_id=?', (mid,)).fetchone()[0] == 0, f'{table} cascade')
            db.close()
            for meeting in request('/api/meetings')[1]['meetings']:
                check(request(f"/api/meetings/{meeting['id']}", 'DELETE')[0] == 204, 'delete all demonstration data')
            stop(); start()
            empty = request('/api/meetings')[1]
            check(empty['total'] == 0 and empty['stats']['total_meetings'] == 0, 'empty workspace remains empty after restart')
            check(empty['participants'] == [] and empty['topics'] == [], 'no orphan filter choices')
            print(f'PASS: {checks} real HTTP, CORS, CRUD, SQLite cascade, and process-restart checks')
        finally:
            stop()
            log.close()


if __name__ == '__main__':
    run()
