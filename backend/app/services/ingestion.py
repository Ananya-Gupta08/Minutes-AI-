import json
import re
from html import unescape
from pydantic import Field, ValidationError
from ..schemas import Input

class Segment(Input):
    speaker_name: str = Field(default='Speaker', min_length=1, max_length=100)
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(gt=0)
    text: str = Field(min_length=1, max_length=10000)

def timestamp(value: str) -> float:
    match = re.fullmatch(r'(?:(\d{2,}):)?([0-5]\d):([0-5]\d)[.,](\d{3})', value)
    if not match:
        raise ValueError('Use VTT timestamps like 00:01:05.000')
    hours, minutes, seconds, milliseconds = match.groups()
    return int(hours or 0) * 3600 + int(minutes) * 60 + int(seconds) + int(milliseconds) / 1000

def speaker_text(line: str, markup: bool = False):
    voice = re.match(r'<v\s+([^>]+)>(.*)', line, re.S) if markup else None
    if voice:
        name, text = voice.groups()
    else:
        match = re.match(r'^([^:\n]{1,100}):\s*(.+)$', line, re.S)
        name, text = match.groups() if match else ('Speaker', line)
    return name.strip(), (unescape(re.sub(r'<[^>]+>', '', text)) if markup else text).strip()

def parse_transcript(raw: str, format: str, duration: int) -> list[dict]:
    raw = raw.lstrip('\ufeff').strip()
    segments = []
    try:
        if format == 'json':
            content = json.loads(raw)
            if not isinstance(content, list):
                raise ValueError('JSON must be an array of transcript segments')
            segments = [Segment.model_validate(item).model_dump() for item in content]
        elif format == 'vtt':
            for block in re.split(r'\n\s*\n', raw.replace('\r\n', '\n')):
                lines = block.splitlines()
                if not lines or lines[0].startswith(('NOTE', 'STYLE', 'REGION')):
                    continue
                index = next((i for i, line in enumerate(lines) if '-->' in line), None)
                if index is None:
                    if lines[0].startswith('WEBVTT'):
                        continue
                    raise ValueError('Invalid VTT cue: every cue needs a start and end timestamp.')
                start, end = lines[index].split('-->', 1)
                name, text = speaker_text(' '.join(lines[index + 1:]), markup=True)
                segments.append(Segment(speaker_name=name, start_seconds=timestamp(start.strip()),
                                        end_seconds=timestamp(end.strip().split()[0]), text=text).model_dump())
        else:
            lines = [line.strip() for line in raw.splitlines() if line.strip()]
            if len(lines) == 1:
                name, text = speaker_text(lines[0])
                turns = [(name, sentence) for sentence in re.split(r'(?<=[.!?])\s+', text)]
            else:
                turns = [speaker_text(line) for line in lines]
            for i, (name, text) in enumerate(turns):
                segments.append(Segment(speaker_name=name, text=text, start_seconds=duration * i / len(turns),
                                        end_seconds=duration * (i + 1) / len(turns)).model_dump())
    except (ValidationError, json.JSONDecodeError, TypeError, KeyError, IndexError) as exc:
        raise ValueError('Invalid transcript. Check the documented format, speaker names, text, and numeric timestamps.') from exc
    if not segments:
        raise ValueError('No transcript segments found. Add meaningful text or valid timestamped cues.')
    if len(segments) > 2000:
        raise ValueError('A transcript can contain at most 2,000 segments.')
    previous_end = 0
    for i, segment in enumerate(segments):
        if segment['start_seconds'] < previous_end or segment['end_seconds'] <= segment['start_seconds']:
            raise ValueError('Segments must be ordered, non-overlapping, and end after they start.')
        if segment['end_seconds'] > duration:
            raise ValueError('Meeting duration must include the last transcript timestamp.')
        previous_end = segment['end_seconds']
        segment['segment_order'] = i
    return segments
