export interface Participant {
  id: number;
  name: string;
  email: string | null;
  avatar_color: string;
}
export interface Segment {
  id: number;
  speaker_name: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
  segment_order: number;
}
export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee: string;
  due_date: string | null;
  completed: boolean;
}
export interface Topic {
  id: number;
  name: string;
}
export interface Chapter {
  id: number;
  title: string;
  description: string;
  start_seconds: number;
  chapter_order: number;
}
export interface Meeting {
  id: number;
  title: string;
  meeting_date: string;
  duration_seconds: number;
  summary_short: string;
  summary_detailed: {
    sections: { title: string; bullets: string[] }[];
    decisions: string[];
    source: string;
  };
  created_at: string;
  updated_at: string;
  participants: Participant[];
  topics: Topic[];
  action_items: ActionItem[];
}
export interface MeetingDetail extends Meeting {
  segments: Segment[];
  chapters: Chapter[];
}
export interface Library {
  meetings: Meeting[];
  total: number;
  stats: {
    total_meetings: number;
    total_hours: number;
    open_action_items: number;
    meetings_this_week: number;
  };
  participants: string[];
  topics: string[];
}
export interface MeetingInput {
  title: string;
  meeting_date: string;
  duration_seconds: number;
  participants: string[];
  tags: string[];
}
export interface MeetingCreate extends MeetingInput {
  raw_transcript: string;
  transcript_format: "txt" | "vtt" | "json";
}
export type ActionInput = Pick<
  ActionItem,
  "text" | "assignee" | "due_date" | "completed"
>;
