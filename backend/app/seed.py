from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from .database import SessionLocal
from .models import Meeting, AppState
from .schemas import MeetingCreate
from .services.meetings import create_meeting

DEMOS = [
    dict(title='Q3 Product Roadmap Planning', tags=['Product', 'Roadmap', 'Strategy'], duration=2700,
         people=['Ananya Gupta', 'Alex Morgan', 'Sarah Chen', 'David Park'],
         summary='The team aligned on a focused Q3 roadmap: simplify onboarding, ship workspace search, and measure activation. The first milestone is a customer-tested prototype, with a staged rollout to follow.',
         lines=[
             'Thanks for joining. Today we are aligning the Q3 roadmap around activation, search, and a calmer onboarding experience.',
             'Customer interviews point to one clear problem: people cannot find the decisions they made last week.',
             'The research includes twelve teams. Eight of them described searching across chat, documents, and meeting notes.',
             'We should make the first useful insight visible within five minutes of creating a workspace.',
             'I will send the research synthesis and the anonymized interview clips by Thursday.',
             'For onboarding, the proposal is a three-step flow: create a workspace, add a transcript, and review the first summary.',
             'The prototype removes the configuration screen. We can ask for preferences after people see value.',
             'That reduces setup friction. We still need a clear explanation of which data is stored.',
             'Agreed: onboarding simplicity is our first milestone, with search immediately after it.',
             'The search index should include meeting titles, participants, topics, and the transcript itself.',
             'We can start with database search and measure latency before introducing a separate indexing service.',
             'I will prepare the search API contract with representative queries and pagination examples.',
             'We need to protect engineering capacity. The calendar integration should move to the next release.',
             'The decision is to defer calendar integration and keep the first release centered on post-meeting work.',
             'Success means a higher activation rate and fewer support requests about finding previous decisions.',
             'I will define the activation dashboard and establish a baseline before the pilot starts.',
             'The pilot group can include five existing customer teams with different meeting volumes.',
             'We should collect qualitative feedback alongside metrics so a low click count does not hide confusion.',
             'I will complete the interactive onboarding prototype and schedule five usability sessions.',
             'We are aligned on scope, owners, and the pilot. Let us review the prototype together next Tuesday.',
         ]),
    dict(title='Customer Onboarding Review', tags=['Customer success', 'Onboarding'], duration=2100,
         people=['Sarah Chen', 'Ananya Gupta', 'Priya Shah', 'Alex Morgan'],
         summary='A review of the first-week customer experience identified invitation friction and unclear setup guidance. The team agreed to simplify the welcome checklist and pilot a new customer success playbook.',
         lines=[
             'Today we are reviewing the first-week experience for our newest customer teams.',
             'Most teams create a workspace successfully, but inviting colleagues is the biggest drop-off.',
             'Three customers thought the invitation email was a marketing message and ignored it.',
             'The welcome screen could show an invitation status so workspace owners know what happened.',
             'I will rewrite the invitation email with a clearer subject and a personal introduction.',
             'The setup checklist has seven steps. Customers only need three of them to get their first useful result.',
             'We should move advanced configuration into settings and explain the defaults in plain language.',
             'Our support team can share the most common questions from the last two weeks.',
             'Agreed: the welcome checklist will focus on adding a meeting, reviewing notes, and sharing an action.',
             'The customer playbook should adapt to small teams instead of assuming an enterprise administrator.',
             'I will draft the new playbook and include a short first-meeting walkthrough.',
             'We can measure time to first reviewed summary and the number of returning teammates.',
             'The current median is eighteen minutes, mostly spent looking for the upload button.',
             'The decision is to make upload available from the persistent navigation.',
             'Let us test the revised flow with three customers before rolling it out broadly.',
             'I will send invitations for the customer pilot and collect consent for the feedback sessions.',
             'We should also test keyboard navigation through the checklist and invitation dialog.',
             'The support handoff needs a named owner for each pilot account.',
             'I will complete the account-owner list and share it with support tomorrow.',
             'Our next review will compare activation, support volume, and direct customer feedback.',
         ]),
    dict(title='Weekly Engineering Stand-up', tags=['Engineering', 'Sprint planning'], duration=1800,
         people=['David Park', 'Ananya Gupta', 'Alex Morgan', 'Maya Patel'],
         summary='Engineering reviewed search performance, transcript synchronization, and release readiness. The team prioritized the player seek bug, agreed on API pagination, and assigned the final accessibility checks.',
         lines=[
             'Let us start with release readiness, then cover blockers and the remaining sprint work.',
             'The transcript API is complete and the response models are now documented.',
             'The database query stays under our target on the evaluation dataset, including transcript matches.',
             'I found a player issue: seeking backwards sometimes leaves the previous line highlighted.',
             'I will fix active-segment selection so it is derived from time on every update.',
             'We should test gaps between transcript cues as well as the exact end of the recording.',
             'The upload form now reports malformed JSON without losing the entered meeting details.',
             'VTT files need a test for cue settings after the end timestamp.',
             'Agreed: player correctness and ingestion validation are release blockers.',
             'The list endpoint returns filter options separately from the filtered result set.',
             'That keeps a selected topic visible even when the search has no matches.',
             'I will add coverage for participant search, literal wildcard characters, and combined filters.',
             'The deployment image starts cleanly and writes the SQLite database to the mounted volume.',
             'The decision is to use one backend instance while we rely on SQLite persistence.',
             'The frontend build is ready for a production environment URL once hosting is configured.',
             'I will complete the keyboard and mobile checks for the meeting detail page.',
             'We should verify that deleting a meeting also removes its transcript and action items.',
             'The foreign-key checks are enabled and the cascade test is passing locally.',
             'I will send the release checklist with the exact verification commands.',
             'No other blockers. We will review the final checks before the release handoff.',
         ]),
    dict(title='Marketing Campaign Retrospective', tags=['Marketing', 'Growth'], duration=2400,
         people=['Priya Shah', 'Sarah Chen', 'Alex Morgan'],
         summary='The launch campaign brought strong engagement from small product teams. Practical workflow examples outperformed broad messaging, so the next campaign will focus on customer stories and clearer attribution.',
         lines=[
             'We are looking back at the launch campaign and deciding what to carry into the next cycle.',
             'The workflow tutorial generated the highest engagement among all the campaign assets.',
             'Generic productivity messaging attracted clicks but fewer completed signups.',
             'Visitors from the customer story spent more time exploring the meeting workspace.',
             'I will send a breakdown of conversion by channel and content type.',
             'We should be careful about attribution because several visitors returned through direct traffic.',
             'The analytics events need consistent campaign parameters before the next launch.',
             'Sales also mentioned that the action-item example helped explain the product quickly.',
             'Agreed: practical meeting workflows will lead the next campaign.',
             'The creative team can produce a short series showing decisions, follow-ups, and searchable notes.',
             'I will draft three customer-story outlines and confirm approval with the featured teams.',
             'The email sequence should give people one concrete thing to try per message.',
             'We can replace the long feature list with a short guide to reviewing a first meeting.',
             'The decision is to pause the lowest-performing ad group and reinvest in the tutorial series.',
             'We should compare activated workspaces rather than optimizing only for new accounts.',
             'I will update the reporting dashboard to include first-week activation.',
             'The next experiment can test a customer quote against an annotated product walkthrough.',
             'Let us keep the landing page consistent so the experiment changes only one variable.',
             'I will complete the experiment brief with a hypothesis and a measurement window.',
             'We have clear follow-ups. The next retrospective will include activation and retention signals.',
         ]),
    dict(title='Design System Handoff', tags=['Design', 'Accessibility'], duration=3300,
         people=['Maya Patel', 'Ananya Gupta', 'David Park', 'Sarah Chen'],
         summary='Design and engineering finalized the shared component guidelines for the meeting workspace. The handoff covers accessible controls, responsive panels, consistent empty states, and a restrained purple visual identity.',
         lines=[
             'This handoff covers the components we need for the meeting library and transcript workspace.',
             'The visual system uses neutral surfaces with purple reserved for important actions and selected states.',
             'The original waveform-and-spark icon is ready in vector format for both the sidebar and favicon.',
             'Typography and spacing should make dense meeting information comfortable to scan.',
             'I will publish the component specifications with spacing and focus-state examples.',
             'The meeting row should show the title first, followed by a short summary and supporting metadata.',
             'Participant avatars need accessible names, and initials must remain readable at small sizes.',
             'We should avoid relying on color alone for completed tasks or active transcript segments.',
             'Agreed: all interactive controls need a visible focus ring and a descriptive accessible label.',
             'The transcript and insights panels stack vertically on narrow screens.',
             'I will review the mobile layout at 390 pixels and check for horizontal overflow.',
             'The delete dialog should explain what is removed and return focus when it closes.',
             'Loading skeletons should reflect the layout instead of replacing the page with a spinner.',
             'The decision is to use one shared dialog component for destructive confirmations and metadata editing.',
             'Empty states should offer a useful next action, such as clearing filters or adding a meeting.',
             'I will complete the empty and error state copy for the library and detail pages.',
             'The original icon looks clear on both white and pale lavender backgrounds.',
             'We need consistent line heights so long action items wrap without colliding with the checkbox.',
             'I will audit contrast and keyboard behavior before the final handoff.',
             'The system is ready for implementation. We will resolve any remaining edge cases in review.',
         ]),
]

def seed_database():
    with SessionLocal() as db:
        if db.get(AppState, 'demo_seeded'):
            return
        if not db.scalar(select(func.count(Meeting.id))):
            now = datetime.now(timezone.utc).replace(hour=9, minute=30, second=0, microsecond=0)
            for index, demo in enumerate(DEMOS):
                people = demo['people']
                raw = '\n'.join(f'{people[i % len(people)]}: {line}' for i, line in enumerate(demo['lines']))
                meeting = create_meeting(db, MeetingCreate(title=demo['title'], tags=demo['tags'],
                    duration_seconds=demo['duration'], meeting_date=now - timedelta(days=index), participants=people, raw_transcript=raw))
                meeting.summary_short = demo['summary']
                meeting.action_items = [a for a in meeting.action_items if a.text.startswith('I will')][:5]
                for i, action in enumerate(meeting.action_items):
                    action.completed = i == 0
                    action.due_date = (now + timedelta(days=i + 2)).date()
        db.add(AppState(key='demo_seeded', value='true'))
        db.commit()
