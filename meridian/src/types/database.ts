/**
 * Hand-maintained mirror of supabase/migrations. Kept compact with a helper so the
 * client stays fully typed. Regenerate with `supabase gen types typescript` if you
 * prefer generated output — the shape is compatible.
 */

export type LifeAreaKey =
  | 'health' | 'career' | 'money' | 'relationships' | 'family' | 'growth'
  | 'learning' | 'business' | 'social' | 'travel' | 'hobbies' | 'other';
export type Priority = 'low' | 'medium' | 'high';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'done' | 'skipped' | 'cancelled';
export type Energy = 'low' | 'medium' | 'high';
export type HabitCadence = 'daily' | 'weekly' | 'custom';
export type HabitLogStatus = 'done' | 'skipped' | 'missed';
export type PlanHorizon = 'month' | 'week';
export type ReflectionKind = 'daily_reset' | 'weekly_review' | 'journal' | 'life_reset';
export type ConversationKind =
  | 'general' | 'onboarding' | 'daily_reset' | 'weekly_review' | 'life_reset' | 'planning';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MemoryKind =
  | 'preference' | 'routine' | 'constraint' | 'fact' | 'relationship' | 'schedule' | 'value';
export type SubscriptionTier = 'free' | 'pro';
export type RecordSource = 'user' | 'ai' | 'import';

type Timestamps = { created_at: string; updated_at: string };
type Owned = { id: string; user_id: string };

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
} & Timestamps;

export type UserPreferences = {
  user_id: string;
  wake_time: string;
  sleep_time: string;
  work_start: string;
  work_end: string;
  working_days: number[];
  daily_capacity_minutes: number;
  planning_style: 'gentle' | 'balanced' | 'ambitious';
  ai_tone: 'warm' | 'direct' | 'coach';
  memory_enabled: boolean;
  analytics_enabled: boolean;
  voice_enabled: boolean;
  notifications_enabled: boolean;
  morning_brief_enabled: boolean;
  morning_brief_time: string;
  daily_reset_enabled: boolean;
  daily_reset_time: string;
  task_reminders_enabled: boolean;
  weekly_review_enabled: boolean;
  theme: 'system' | 'light' | 'dark';
} & Timestamps;

export type Subscription = {
  user_id: string;
  tier: SubscriptionTier;
  status: string;
  platform: string | null;
  product_id: string | null;
  started_at: string;
  current_period_end: string | null;
  cancel_at: string | null;
  updated_at: string;
};

export type LifeArea = Owned & {
  key: LifeAreaKey;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  satisfaction: number | null;
} & Timestamps;

export type Goal = Owned & {
  life_area_id: string | null;
  title: string;
  description: string | null;
  why: string | null;
  target_date: string | null;
  priority: Priority;
  status: GoalStatus;
  progress: number;
  strategy: { title: string; detail?: string }[];
  source: RecordSource;
  completed_at: string | null;
} & Timestamps;

export type GoalMilestone = Owned & {
  goal_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
};

export type Project = Owned & {
  life_area_id: string | null;
  goal_id: string | null;
  title: string;
  description: string | null;
  status: GoalStatus;
  due_date: string | null;
  progress: number;
  notes: string | null;
  source: RecordSource;
} & Timestamps;

export type ProjectMilestone = Owned & {
  project_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
};

export type Habit = Owned & {
  life_area_id: string | null;
  goal_id: string | null;
  title: string;
  cadence: HabitCadence;
  target_per_week: number;
  days_of_week: number[] | null;
  preferred_time: string | null;
  duration_minutes: number;
  reminder_enabled: boolean;
  is_active: boolean;
  source: RecordSource;
} & Timestamps;

export type HabitLog = Owned & {
  habit_id: string;
  date: string;
  status: HabitLogStatus;
  note: string | null;
  created_at: string;
};

export type Task = Owned & {
  life_area_id: string | null;
  goal_id: string | null;
  project_id: string | null;
  habit_id: string | null;
  title: string;
  notes: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number;
  priority: Priority;
  energy: Energy;
  status: TaskStatus;
  is_focus: boolean;
  order_index: number;
  source: RecordSource;
  completed_at: string | null;
} & Timestamps;

export type CalendarEvent = Owned & {
  life_area_id: string | null;
  title: string;
  notes: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  provider: string;
  external_id: string | null;
  source: RecordSource;
} & Timestamps;

export type DailyPlan = Owned & {
  date: string;
  headline: string | null;
  summary: string | null;
  focus: { task_id?: string; title: string }[];
  capacity_minutes: number | null;
  planned_minutes: number | null;
  generated_by: RecordSource;
} & Timestamps;

export type WeeklyPlan = Owned & {
  week_start: string;
  summary: string | null;
  priorities: { title: string; detail?: string }[];
  risks: { title: string; detail?: string }[];
  recommended_moves: { task_id?: string; title: string; to_date?: string; reason?: string }[];
} & Timestamps;

export type LifePlan = Owned & {
  title: string;
  vision: string | null;
  start_date: string;
  end_date: string;
  status: GoalStatus;
} & Timestamps;

export type LifePlanItem = Owned & {
  life_plan_id: string;
  horizon: PlanHorizon;
  position: number;
  title: string;
  description: string | null;
  objectives: string[];
  is_done: boolean;
  created_at: string;
};

export type Reflection = Owned & {
  date: string;
  kind: ReflectionKind;
  raw_text: string | null;
  mood: number | null;
  energy: number | null;
  wins: string[];
  obstacles: string[];
  lessons: string[];
  created_at: string;
};

export type AiConversation = Owned & {
  title: string | null;
  kind: ConversationKind;
  archived: boolean;
} & Timestamps;

export type AiActionReceipt = {
  tool: string;
  status: 'succeeded' | 'failed' | 'awaiting_confirmation' | 'rejected';
  summary: string;
  entity_id?: string | null;
  entity_type?: string | null;
  error?: string | null;
};

export type AiMessage = Owned & {
  conversation_id: string;
  role: MessageRole;
  content: string;
  actions: AiActionReceipt[];
  suggestions: string[];
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type AiMemory = Owned & {
  kind: MemoryKind;
  key: string;
  value: string;
  importance: number;
  is_active: boolean;
  source_conversation_id: string | null;
} & Timestamps;

export type AiUsage = {
  user_id: string;
  date: string;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
};

export type AppNotification = Owned & {
  kind: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  scheduled_for: string | null;
  delivered_at: string | null;
  read_at: string | null;
  local_identifier: string | null;
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  user_id: string | null;
  name: string;
  props: Record<string, unknown>;
  created_at: string;
};

export type LifeProgressRow = {
  life_area_id: string;
  area_key: LifeAreaKey;
  name: string;
  goal_progress: number;
  habit_consistency: number;
  task_completion: number;
  score: number;
  goal_count: number;
  habit_count: number;
};

type Def<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Def<Profile>;
      user_preferences: Def<UserPreferences>;
      subscriptions: Def<Subscription>;
      life_areas: Def<LifeArea>;
      goals: Def<Goal>;
      goal_milestones: Def<GoalMilestone>;
      projects: Def<Project>;
      project_milestones: Def<ProjectMilestone>;
      habits: Def<Habit>;
      habit_logs: Def<HabitLog>;
      tasks: Def<Task>;
      calendar_events: Def<CalendarEvent>;
      daily_plans: Def<DailyPlan>;
      weekly_plans: Def<WeeklyPlan>;
      life_plans: Def<LifePlan>;
      life_plan_items: Def<LifePlanItem>;
      reflections: Def<Reflection>;
      ai_conversations: Def<AiConversation>;
      ai_messages: Def<AiMessage>;
      ai_memory: Def<AiMemory>;
      ai_usage: Def<AiUsage>;
      notifications: Def<AppNotification>;
      analytics_events: Def<AnalyticsEvent>;
    };
    Views: Record<string, never>;
    Functions: {
      get_life_progress: { Args: Record<string, never>; Returns: LifeProgressRow[] };
      get_habit_streak: { Args: { p_habit_id: string }; Returns: number };
      export_my_data: { Args: Record<string, never>; Returns: Record<string, unknown> };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
      forget_everything: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
