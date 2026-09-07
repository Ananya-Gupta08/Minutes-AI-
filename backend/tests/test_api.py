import os
import tempfile
from pathlib import Path

test_dir = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(test_dir.name) / 'test.db').replace('\\', '/')
os.environ['SEED_DEMO'] = 'true'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from app.main import app
from app.database import SessionLocal, engine
from app.models import TranscriptSegment, ActionItem, Topic, Chapter, meeting_participants

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:
        yield c
    engine.dispose()
    test_dir.cleanup()

def payload(**overrides):
    return dict(title='Evaluation sync', meeting_date='2026-09-07T09:00:00Z', duration_seconds=60,
                participants=['Ananya Gupta'], tags=['Evaluation'],
                raw_transcript='Ananya Gupta: We agreed to ship the prototype.\nAlex Morgan: I will send the final checklist.', **overrides)

def test_health_and_seed(client):
    assert client.get('/api/health').json()['status'] == 'ok'
    library = client.get('/api/meetings').json()
    assert library['total'] == 5
    assert library['stats']['total_meetings'] == 5
    assert len(library['participants']) >= 5
    for row in library['meetings']:
        meeting = client.get(f"/api/meetings/{row['id']}").json()
        assert len(meeting['segments']) == 20
        assert len(meeting['chapters']) == 4
        assert 3 <= len(meeting['action_items']) <= 5
        assert meeting['meeting_date'].endswith('Z')
        assert meeting['segments'][-1]['end_seconds'] <= meeting['duration_seconds']

def test_search_filters_and_sort(client):
    assert client.get('/api/search', params={'q':'anonymized'}).json()['total'] == 1
    assert client.get('/api/meetings', params={'search':'Maya Patel'}).json()['total'] == 2
    assert client.get('/api/meetings', params={'topic':'Marketing'}).json()['total'] == 1
    assert client.get('/api/meetings', params={'search':'%'}).json()['total'] == 0
    assert client.get('/api/meetings', params={'participant':'Sarah Chen', 'topic':'Design'}).json()['total'] == 1
    assert client.get('/api/meetings', params={'date_from':'2099-01-01'}).json()['total'] == 0
    assert client.get('/api/meetings', params={'date_from':'2026-10-01', 'date_to':'2026-01-01'}).status_code == 422
    rows = client.get('/api/meetings', params={'sort':'title'}).json()['meetings']
    assert [m['title'] for m in rows] == sorted(m['title'] for m in rows)
    assert len(client.get('/api/meetings?limit=2&offset=2').json()['meetings']) == 2

def test_crud_actions_persistence_and_cascade(client):
    response = client.post('/api/meetings', json=payload())
    assert response.status_code == 201, response.text
    meeting = response.json(); mid = meeting['id']
    assert len(meeting['participants']) == 2
    assert client.patch(f'/api/meetings/{mid}', json={'title':'Renamed sync', 'tags':['Evaluation','Decisions']}).status_code == 200
    assert client.patch(f'/api/meetings/{mid}', json={'tags':['Evaluation','Decisions']}).status_code == 200
    assert client.patch(f'/api/meetings/{mid}', json={'duration_seconds':20}).status_code == 422
    action = client.post(f'/api/meetings/{mid}/action-items', json={'text':'Verify persisted data', 'assignee':'Ananya Gupta','due_date':'2026-09-10'}).json()
    aid = action['id']
    assert client.patch(f'/api/action-items/{aid}', json={'completed':True,'due_date':None}).json()['completed'] is True
    # A new request/session reads committed state.
    refreshed = client.get(f'/api/meetings/{mid}').json()
    assert refreshed['title'] == 'Renamed sync'
    assert next(a for a in refreshed['action_items'] if a['id'] == aid)['due_date'] is None
    assert client.delete(f'/api/action-items/{aid}').status_code == 204
    assert client.delete(f'/api/action-items/{aid}').status_code == 404
    assert client.delete(f'/api/meetings/{mid}').status_code == 204
    assert client.get(f'/api/meetings/{mid}').status_code == 404
    with SessionLocal() as db:
        for model in [TranscriptSegment, ActionItem, Topic, Chapter]:
            assert db.scalar(select(func.count(model.id)).where(model.meeting_id == mid)) == 0
        assert db.scalar(select(func.count()).select_from(meeting_participants).where(meeting_participants.c.meeting_id == mid)) == 0

@pytest.mark.parametrize('format,raw', [
    ('vtt', 'WEBVTT\n\n00:00:00.000 --> 00:00:10.000 align:start\n<v Ananya>Hello team.\n\n00:00:10.000 --> 00:00:20.000\nAlex: I will follow up.'),
    ('json', '[{"speaker_name":"Ananya","start_seconds":0,"end_seconds":10,"text":"Hello team."}]'),
])
def test_ingestion_formats(client, format, raw):
    data = payload(); data.update(transcript_format=format, raw_transcript=raw)
    response = client.post('/api/meetings', json=data)
    assert response.status_code == 201, response.text
    assert response.json()['segments'][0]['speaker_name'] == 'Ananya'
    client.delete(f"/api/meetings/{response.json()['id']}")

@pytest.mark.parametrize('changes', [
    {'title':'   '}, {'duration_seconds':0}, {'participants':['  ']},
    {'transcript_format':'json','raw_transcript':'{"bad":true}'},
    {'transcript_format':'json','raw_transcript':'[{"start_seconds":0,"end_seconds":100,"text":"Too long"}]'},
    {'transcript_format':'json','raw_transcript':'[{"start_seconds":0,"end_seconds":10,"text":"One"},{"start_seconds":5,"end_seconds":20,"text":"Overlap"}]'},
    {'transcript_format':'json','raw_transcript':'[{"start_seconds":0,"end_seconds":NaN,"text":"Invalid"}]'},
    {'transcript_format':'vtt','raw_transcript':'WEBVTT\n\ninvalid'},
])
def test_invalid_input(client, changes):
    data = payload(); data.update(changes)
    assert client.post('/api/meetings', json=data).status_code == 422

def test_null_patch_and_missing(client):
    assert client.patch('/api/meetings/1', json={'title':None}).status_code == 422
    assert client.patch('/api/action-items/1', json={'completed':None}).status_code == 422
    assert client.get('/api/meetings/999999').status_code == 404
    assert client.post('/api/meetings/999999/action-items', json={'text':'Missing'}).status_code == 404

def test_seed_runs_only_once(client):
    from app.seed import seed_database
    before = client.get('/api/meetings').json()['total']
    seed_database()
    assert client.get('/api/meetings').json()['total'] == before

def test_supplied_topics_and_long_generated_tasks(client):
    data = payload()
    data.update(tags=[f'Topic {i}' for i in range(20)], raw_transcript='Ananya: I will ' + 'review ' * 400)
    response = client.post('/api/meetings', json=data)
    assert response.status_code == 201, response.text
    meeting = response.json()
    assert {t['name'] for t in meeting['topics']} == set(data['tags'])
    action = meeting['action_items'][0]
    assert len(action['text']) <= 2000
    assert client.patch(f"/api/action-items/{action['id']}", json={'text': action['text']}).status_code == 200
    client.delete(f"/api/meetings/{meeting['id']}")

def test_relationship_only_edit_updates_timestamp(client):
    meeting = client.post('/api/meetings', json=payload()).json()
    updated = client.patch(f"/api/meetings/{meeting['id']}", json={'tags':['Changed'], 'participants':['New Person']}).json()
    assert updated['updated_at'] > meeting['updated_at']
    assert [p['name'] for p in updated['participants']] == ['New Person']
    assert updated['segments'] == meeting['segments']
    client.delete(f"/api/meetings/{meeting['id']}")

def test_plain_text_preserves_literals_and_speaker(client):
    data = payload()
    data['raw_transcript'] = 'Ananya: Review <button> markup & <script>alert(1)</script>. I will send notes.'
    meeting = client.post('/api/meetings', json=data).json()
    assert '<script>alert(1)</script>' in meeting['segments'][0]['text']
    assert all(s['speaker_name'] == 'Ananya' for s in meeting['segments'])
    client.delete(f"/api/meetings/{meeting['id']}")

@pytest.mark.parametrize('bad_cue', [
    'broken cue without timestamps',
    '00:00:05.000 -> 00:00:10.000\nLost text',
    '00:00:5e0 --> 00:00:10.000\nInvalid seconds',
    '00:00:05.1000 --> 00:00:10.000\nInvalid precision',
])
def test_vtt_never_silently_discards_invalid_cues(client, bad_cue):
    data = payload()
    data.update(transcript_format='vtt', raw_transcript='WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nValid cue\n\n' + bad_cue)
    assert client.post('/api/meetings', json=data).status_code == 422

def test_vtt_entities_and_gaps(client):
    data = payload()
    data.update(transcript_format='vtt', raw_transcript='WEBVTT\n\n00:00:00.000 --> 00:00:05.000\n<v Ananya>A &amp; B\n\n00:00:10.000 --> 00:00:15.000\n<v Alex>We agree.')
    meeting = client.post('/api/meetings', json=data).json()
    assert meeting['segments'][0]['text'] == 'A & B'
    assert meeting['segments'][1]['start_seconds'] == 10
    client.delete(f"/api/meetings/{meeting['id']}")

def test_cors_preflight(client):
    for origin, status in [('http://localhost:3000',200), ('http://127.0.0.1:3000',200), ('https://untrusted.example',400)]:
        response = client.options('/api/meetings', headers={'Origin':origin, 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type'})
        assert response.status_code == status
        assert response.headers.get('access-control-allow-origin') == (origin if status == 200 else None)

def test_utc_date_boundaries_and_all_sort_orders(client):
    data = payload(); data['meeting_date'] = '2026-01-03T00:30:00+05:30'
    meeting = client.post('/api/meetings', json=data).json()
    assert meeting['meeting_date'] == '2026-01-02T19:00:00Z'
    assert client.get('/api/meetings?date_from=2026-01-02&date_to=2026-01-02').json()['total'] == 1
    assert client.get('/api/meetings?date_to=9999-12-31').status_code == 200
    for sort, reverse in [('newest',True), ('oldest',False)]:
        rows = client.get(f'/api/meetings?sort={sort}').json()['meetings']
        dates = [m['meeting_date'] for m in rows]
        assert dates == sorted(dates, reverse=reverse)
    client.delete(f"/api/meetings/{meeting['id']}")

def test_database_level_cascade_and_foreign_keys(client):
    from sqlalchemy import delete, text
    from sqlalchemy.exc import IntegrityError
    from app.models import Meeting
    meeting = client.post('/api/meetings', json=payload()).json()
    mid = meeting['id']
    with SessionLocal() as db:
        assert db.scalar(text('PRAGMA foreign_keys')) == 1
        db.execute(delete(Meeting).where(Meeting.id == mid))
        db.commit()
        for model in [TranscriptSegment, ActionItem, Topic, Chapter]:
            assert db.scalar(select(func.count(model.id)).where(model.meeting_id == mid)) == 0
        assert db.scalar(select(func.count()).select_from(meeting_participants).where(meeting_participants.c.meeting_id == mid)) == 0
        db.add(ActionItem(meeting_id=999999, text='Orphan', assignee='No one'))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

@pytest.mark.parametrize('params', [{'limit':0}, {'offset':-1}, {'sort':'invalid'}, {'search':'x'*201}])
def test_invalid_list_parameters(client, params):
    assert client.get('/api/meetings', params=params).status_code == 422
