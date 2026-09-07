import re
from collections import Counter

STOPWORDS = set('the and this that with from have will need our your for are was were you all but not can has its into about there they their would should could been also what when where which more then than just today thanks everyone meeting let lets well really some going want know think good great'.split())

def analyze(segments: list[dict], tags: list[str]) -> dict:
    texts = [s['text'] for s in segments]
    words = re.findall(r'\b[a-z]{4,}\b', ' '.join(texts).lower())
    topics = list(dict.fromkeys(tags)) or [w.title() for w, _ in Counter(w for w in words if w not in STOPWORDS and len(w) <= 60).most_common(5)]
    chunk_size = max(1, (len(segments) + 3) // 4)
    chapters, sections = [], []
    labels = ['Context & priorities', 'Discussion & opportunities', 'Decisions & next steps', 'Wrap-up & ownership']
    for i, offset in enumerate(range(0, len(segments), chunk_size)):
        group = segments[offset:offset + chunk_size]
        title = labels[min(i, 3)]
        chapters.append(dict(title=title, description=group[0]['text'][:220], start_seconds=group[0]['start_seconds'], chapter_order=i))
        sections.append(dict(title=title, bullets=[s['text'] for s in group[:3]]))
    actions = [dict(text=s['text'][:2000], assignee=s['speaker_name'] if s['speaker_name'] != 'Speaker' else 'Unassigned')
               for s in segments if re.search(r'\b(will|need to|follow up|send|complete)\b', s['text'], re.I)][:8]
    decisions = [text for text in texts if re.search(r'\b(agreed|decided|decision|approved|confirmed)\b', text, re.I)][:5]
    return dict(summary_short=' '.join(texts[:2])[:550],
                summary_detailed=dict(sections=sections, decisions=decisions, source='deterministic'),
                topics=topics, chapters=chapters, action_items=actions)
