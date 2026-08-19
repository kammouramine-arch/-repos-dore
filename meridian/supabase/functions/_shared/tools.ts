import { z } from 'zod';

/**
 * The complete set of actions the assistant is allowed to take.
 *
 * This file is the single source of truth, shared by the mobile app (which renders
 * receipts and confirmation prompts) and the edge function (which validates and
 * executes). The model can only ever call these named tools with these arguments —
 * there is no path from a model output to arbitrary SQL.
 */

const uuid = z.string().uuid();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)');
const priority = z.enum(['low', 'medium', 'high']);
const energy = z.enum(['low', 'medium', 'high']);
const areaKey = z.enum([
  'health', 'career', 'money', 'relationships', 'family', 'growth',
  'learning', 'business', 'social', 'travel', 'hobbies', 'other',
]);

export const toolSchemas = {
  // ------------------------------------------------------------------ read --
  get_today: z.object({
    date: isoDate.optional().describe('Defaults to the user\'s today.'),
  }),
  get_week: z.object({
    week_start: isoDate.optional().describe('Monday of the week. Defaults to this week.'),
  }),
  get_goals: z.object({
    status: z.enum(['active', 'paused', 'completed', 'archived', 'all']).optional(),
    life_area: areaKey.optional(),
  }),
  get_habits: z.object({ include_inactive: z.boolean().optional() }),
  get_projects: z.object({
    status: z.enum(['active', 'paused', 'completed', 'archived', 'all']).optional(),
  }),
  get_life_areas: z.object({}),
  get_progress: z.object({}),
  get_tasks: z.object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    status: z.enum(['todo', 'done', 'skipped', 'cancelled', 'all']).optional(),
    search: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  get_memory: z.object({}),

  // ----------------------------------------------------------------- goals --
  create_goal: z.object({
    title: z.string().min(2).max(160),
    description: z.string().max(1200).optional(),
    why: z.string().max(600).optional().describe('The user\'s own reason, in their words.'),
    life_area: areaKey.optional(),
    target_date: isoDate.optional(),
    priority: priority.optional(),
    strategy: z
      .array(z.object({ title: z.string().min(2).max(160), detail: z.string().max(600).optional() }))
      .max(12)
      .optional()
      .describe('Ordered steps from where they are to the goal.'),
    milestones: z
      .array(z.object({ title: z.string().min(2).max(160), due_date: isoDate.optional() }))
      .max(12)
      .optional(),
  }),
  update_goal: z.object({
    goal_id: uuid,
    title: z.string().min(2).max(160).optional(),
    description: z.string().max(1200).optional(),
    target_date: isoDate.nullable().optional(),
    priority: priority.optional(),
    status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
    life_area: areaKey.optional(),
    strategy: z
      .array(z.object({ title: z.string().min(2).max(160), detail: z.string().max(600).optional() }))
      .max(12)
      .optional(),
  }),
  delete_goal: z.object({ goal_id: uuid, reason: z.string().max(200).optional() }),
  add_goal_milestone: z.object({
    goal_id: uuid,
    title: z.string().min(2).max(160),
    due_date: isoDate.optional(),
  }),
  complete_goal_milestone: z.object({ milestone_id: uuid, is_done: z.boolean().optional() }),

  // ----------------------------------------------------------------- tasks --
  create_task: z.object({
    title: z.string().min(2).max(200),
    notes: z.string().max(1000).optional(),
    scheduled_date: isoDate.optional(),
    scheduled_time: clock.optional(),
    duration_minutes: z.number().int().min(5).max(600).optional(),
    priority: priority.optional(),
    energy: energy.optional(),
    is_focus: z.boolean().optional().describe('Only for the day\'s few real priorities.'),
    goal_id: uuid.optional(),
    project_id: uuid.optional(),
    life_area: areaKey.optional(),
  }),
  update_task: z.object({
    task_id: uuid,
    title: z.string().min(2).max(200).optional(),
    notes: z.string().max(1000).optional(),
    scheduled_time: clock.nullable().optional(),
    duration_minutes: z.number().int().min(5).max(600).optional(),
    priority: priority.optional(),
    energy: energy.optional(),
    is_focus: z.boolean().optional(),
  }),
  complete_task: z.object({ task_id: uuid, done: z.boolean().optional() }),
  reschedule_task: z.object({
    task_id: uuid,
    scheduled_date: isoDate,
    scheduled_time: clock.nullable().optional(),
  }),
  delete_task: z.object({ task_id: uuid }),

  // ---------------------------------------------------------------- habits --
  create_habit: z.object({
    title: z.string().min(2).max(160),
    cadence: z.enum(['daily', 'weekly', 'custom']).optional(),
    target_per_week: z.number().int().min(1).max(21).optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional().describe('0 = Sunday'),
    preferred_time: clock.optional(),
    duration_minutes: z.number().int().min(5).max(300).optional(),
    life_area: areaKey.optional(),
    goal_id: uuid.optional(),
  }),
  update_habit: z.object({
    habit_id: uuid,
    title: z.string().min(2).max(160).optional(),
    cadence: z.enum(['daily', 'weekly', 'custom']).optional(),
    target_per_week: z.number().int().min(1).max(21).optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    preferred_time: clock.nullable().optional(),
    duration_minutes: z.number().int().min(5).max(300).optional(),
    is_active: z.boolean().optional(),
  }),
  log_habit: z.object({
    habit_id: uuid,
    date: isoDate.optional(),
    status: z.enum(['done', 'skipped', 'missed']).optional(),
    note: z.string().max(300).optional(),
  }),
  delete_habit: z.object({ habit_id: uuid }),

  // -------------------------------------------------------------- projects --
  create_project: z.object({
    title: z.string().min(2).max(160),
    description: z.string().max(1200).optional(),
    due_date: isoDate.optional(),
    life_area: areaKey.optional(),
    goal_id: uuid.optional(),
    milestones: z
      .array(z.object({ title: z.string().min(2).max(160), due_date: isoDate.optional() }))
      .max(15)
      .optional(),
  }),
  update_project: z.object({
    project_id: uuid,
    title: z.string().min(2).max(160).optional(),
    description: z.string().max(1200).optional(),
    due_date: isoDate.nullable().optional(),
    status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
    notes: z.string().max(2000).optional(),
  }),
  add_project_milestone: z.object({
    project_id: uuid,
    title: z.string().min(2).max(160),
    due_date: isoDate.optional(),
  }),
  complete_project_milestone: z.object({ milestone_id: uuid, is_done: z.boolean().optional() }),
  delete_project: z.object({ project_id: uuid }),

  // -------------------------------------------------------------- calendar --
  create_event: z.object({
    title: z.string().min(2).max(160),
    date: isoDate,
    start_time: clock,
    end_time: clock,
    location: z.string().max(160).optional(),
    notes: z.string().max(600).optional(),
    life_area: areaKey.optional(),
  }),
  update_event: z.object({
    event_id: uuid,
    title: z.string().min(2).max(160).optional(),
    date: isoDate.optional(),
    start_time: clock.optional(),
    end_time: clock.optional(),
    location: z.string().max(160).nullable().optional(),
  }),
  delete_event: z.object({ event_id: uuid }),

  // ----------------------------------------------------------------- plans --
  create_daily_plan: z.object({
    date: isoDate.optional(),
    headline: z.string().max(220).describe('One useful sentence about the day.'),
    summary: z.string().max(1200).optional(),
    focus: z
      .array(z.object({ task_id: uuid.optional(), title: z.string().min(2).max(200) }))
      .max(3)
      .describe('At most three real priorities.'),
  }),
  reorganize_day: z.object({
    date: isoDate.optional(),
    moves: z
      .array(
        z.object({
          task_id: uuid,
          scheduled_date: isoDate.optional(),
          scheduled_time: clock.nullable().optional(),
          reason: z.string().max(200).optional(),
        }),
      )
      .max(25),
    headline: z.string().max(220).optional(),
  }),
  create_weekly_plan: z.object({
    week_start: isoDate.optional(),
    summary: z.string().max(1500),
    priorities: z
      .array(z.object({ title: z.string().min(2).max(160), detail: z.string().max(400).optional() }))
      .max(6),
    risks: z
      .array(z.object({ title: z.string().min(2).max(160), detail: z.string().max(400).optional() }))
      .max(6)
      .optional(),
    recommended_moves: z
      .array(
        z.object({
          task_id: uuid.optional(),
          title: z.string().max(200),
          to_date: isoDate.optional(),
          reason: z.string().max(200).optional(),
        }),
      )
      .max(12)
      .optional(),
  }),
  replan_week: z.object({
    week_start: isoDate.optional(),
    moves: z
      .array(
        z.object({
          task_id: uuid,
          scheduled_date: isoDate,
          reason: z.string().max(200).optional(),
        }),
      )
      .max(40),
    summary: z.string().max(1200).optional(),
  }),
  generate_90_day_plan: z.object({
    title: z.string().max(160).optional(),
    vision: z.string().min(10).max(2000).describe('Where the user wants to be in 90 days.'),
    start_date: isoDate.optional(),
    months: z
      .array(
        z.object({
          position: z.number().int().min(1).max(3),
          title: z.string().min(2).max(160),
          description: z.string().max(800).optional(),
          objectives: z.array(z.string().max(200)).max(6).optional(),
        }),
      )
      .length(3),
    weeks: z
      .array(
        z.object({
          position: z.number().int().min(1).max(13),
          title: z.string().min(2).max(160),
          objectives: z.array(z.string().max(200)).max(5).optional(),
        }),
      )
      .max(13)
      .optional(),
  }),

  // ------------------------------------------------- life map, memory, misc --
  create_life_area: z.object({
    key: areaKey,
    name: z.string().min(2).max(60),
    description: z.string().max(400).optional(),
  }),
  update_life_area: z.object({
    life_area_id: uuid,
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(400).optional(),
    satisfaction: z.number().int().min(0).max(100).optional(),
    is_active: z.boolean().optional(),
  }),
  create_reflection: z.object({
    kind: z.enum(['daily_reset', 'weekly_review', 'journal', 'life_reset']).optional(),
    date: isoDate.optional(),
    raw_text: z.string().max(4000).optional(),
    mood: z.number().int().min(1).max(5).optional(),
    energy: z.number().int().min(1).max(5).optional(),
    wins: z.array(z.string().max(200)).max(8).optional(),
    obstacles: z.array(z.string().max(200)).max(8).optional(),
    lessons: z.array(z.string().max(200)).max(8).optional(),
  }),
  create_reminder: z.object({
    title: z.string().min(2).max(160),
    body: z.string().max(300).optional(),
    /** Local wall-clock time, e.g. 2026-03-14T18:30 */
    remind_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, 'Use YYYY-MM-DDTHH:MM'),
    kind: z.enum(['task', 'habit', 'goal', 'general']).optional(),
  }),
  remember: z.object({
    kind: z.enum(['preference', 'routine', 'constraint', 'fact', 'relationship', 'schedule', 'value']),
    key: z.string().min(2).max(80).describe('Stable slug, e.g. work_hours or gym_days.'),
    value: z.string().min(2).max(600),
    importance: z.number().int().min(1).max(5).optional(),
  }),
  forget: z.object({ key: z.string().min(2).max(80) }),
  update_user_preference: z.object({
    wake_time: clock.optional(),
    sleep_time: clock.optional(),
    work_start: clock.optional(),
    work_end: clock.optional(),
    working_days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    daily_capacity_minutes: z.number().int().min(30).max(960).optional(),
    planning_style: z.enum(['gentle', 'balanced', 'ambitious']).optional(),
  }),
  complete_onboarding: z.object({
    full_name: z.string().max(80).optional(),
    summary: z.string().max(1500).describe('What you understood about their life.'),
  }),
} as const;

export type ToolName = keyof typeof toolSchemas;
export type ToolInput<T extends ToolName> = z.infer<(typeof toolSchemas)[T]>;

type ToolMeta = {
  description: string;
  /** Read-only tools never change state and never need confirmation. */
  mutating: boolean;
  /** Destructive or wide-reaching changes must be approved by the user first. */
  requiresConfirmation: boolean;
  /** Gated behind Pro. */
  proOnly?: boolean;
};

export const toolMeta: Record<ToolName, ToolMeta> = {
  get_today: { description: "Read the user's tasks, events and plan for a day.", mutating: false, requiresConfirmation: false },
  get_week: { description: 'Read the tasks, events and plan for a week.', mutating: false, requiresConfirmation: false },
  get_goals: { description: 'List goals with progress and milestones.', mutating: false, requiresConfirmation: false },
  get_habits: { description: 'List habits with recent consistency and streaks.', mutating: false, requiresConfirmation: false },
  get_projects: { description: 'List projects with milestones and progress.', mutating: false, requiresConfirmation: false },
  get_life_areas: { description: 'List the life areas that make up the Life Map.', mutating: false, requiresConfirmation: false },
  get_progress: { description: 'Read overall and per-area life progress.', mutating: false, requiresConfirmation: false },
  get_tasks: { description: 'Search tasks by date range, status or text.', mutating: false, requiresConfirmation: false },
  get_memory: { description: 'Read what you remember about this user.', mutating: false, requiresConfirmation: false },

  create_goal: { description: 'Create a goal, optionally with a strategy and milestones.', mutating: true, requiresConfirmation: false },
  update_goal: { description: 'Update an existing goal.', mutating: true, requiresConfirmation: false },
  delete_goal: { description: 'Permanently delete a goal and its milestones.', mutating: true, requiresConfirmation: true },
  add_goal_milestone: { description: 'Add a milestone to a goal.', mutating: true, requiresConfirmation: false },
  complete_goal_milestone: { description: 'Mark a goal milestone done or not done.', mutating: true, requiresConfirmation: false },

  create_task: { description: 'Create a task, optionally scheduled and linked to a goal or project.', mutating: true, requiresConfirmation: false },
  update_task: { description: 'Update a task in place.', mutating: true, requiresConfirmation: false },
  complete_task: { description: 'Mark a task done, or reopen it.', mutating: true, requiresConfirmation: false },
  reschedule_task: { description: 'Move a task to another date or time.', mutating: true, requiresConfirmation: false },
  delete_task: { description: 'Permanently delete a task.', mutating: true, requiresConfirmation: true },

  create_habit: { description: 'Create a habit with a realistic cadence.', mutating: true, requiresConfirmation: false },
  update_habit: { description: 'Update a habit.', mutating: true, requiresConfirmation: false },
  log_habit: { description: 'Record a habit as done, skipped or missed for a date.', mutating: true, requiresConfirmation: false },
  delete_habit: { description: 'Permanently delete a habit and its history.', mutating: true, requiresConfirmation: true },

  create_project: { description: 'Create a project with milestones.', mutating: true, requiresConfirmation: false },
  update_project: { description: 'Update a project.', mutating: true, requiresConfirmation: false },
  add_project_milestone: { description: 'Add a milestone to a project.', mutating: true, requiresConfirmation: false },
  complete_project_milestone: { description: 'Mark a project milestone done or not done.', mutating: true, requiresConfirmation: false },
  delete_project: { description: 'Permanently delete a project.', mutating: true, requiresConfirmation: true },

  create_event: { description: 'Add an event to the internal calendar.', mutating: true, requiresConfirmation: false },
  update_event: { description: 'Change an event time, date or title.', mutating: true, requiresConfirmation: false },
  delete_event: { description: 'Delete a calendar event.', mutating: true, requiresConfirmation: true },

  create_daily_plan: { description: "Write the day's headline and up to three priorities.", mutating: true, requiresConfirmation: false },
  reorganize_day: { description: 'Move several tasks at once to restructure a day.', mutating: true, requiresConfirmation: true },
  create_weekly_plan: { description: 'Write the weekly plan: priorities, risks and suggested moves.', mutating: true, requiresConfirmation: false, proOnly: true },
  replan_week: { description: 'Move many tasks across the week at once.', mutating: true, requiresConfirmation: true, proOnly: true },
  generate_90_day_plan: { description: 'Create a 90-day plan with three months and weekly objectives.', mutating: true, requiresConfirmation: false, proOnly: true },

  create_life_area: { description: 'Add a life area to the Life Map.', mutating: true, requiresConfirmation: false },
  update_life_area: { description: 'Rename a life area or record how satisfied they are with it.', mutating: true, requiresConfirmation: false },
  create_reflection: { description: 'Store a reflection with wins, obstacles and lessons.', mutating: true, requiresConfirmation: false },
  create_reminder: { description: 'Schedule a notification at a specific local time.', mutating: true, requiresConfirmation: false },
  remember: { description: 'Store a durable fact, preference or constraint about the user.', mutating: true, requiresConfirmation: false },
  forget: { description: 'Delete a stored memory by key.', mutating: true, requiresConfirmation: false },
  update_user_preference: { description: 'Update working hours, capacity or planning style.', mutating: true, requiresConfirmation: false },
  complete_onboarding: { description: 'Mark the life interview finished once you understand their life.', mutating: true, requiresConfirmation: false },
};

export const TOOL_NAMES = Object.keys(toolSchemas) as ToolName[];

export function isToolName(value: string): value is ToolName {
  return Object.prototype.hasOwnProperty.call(toolSchemas, value);
}

export function requiresConfirmation(tool: ToolName): boolean {
  return toolMeta[tool].requiresConfirmation;
}

/** Anthropic tool definitions, generated from the same zod schemas used to validate. */
export function anthropicTools(options?: { exclude?: ToolName[] }) {
  const exclude = new Set(options?.exclude ?? []);
  return TOOL_NAMES.filter((name) => !exclude.has(name)).map((name) => {
    const schema = z.toJSONSchema(toolSchemas[name], { io: 'input' }) as Record<string, unknown>;
    delete schema.$schema;
    return {
      name,
      description: toolMeta[name].description,
      input_schema: { ...schema, type: 'object', additionalProperties: false },
    };
  });
}

/** Validates model-supplied arguments. Never trust the raw input. */
export function validateToolInput(
  tool: ToolName,
  input: unknown,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const result = toolSchemas[tool].safeParse(input ?? {});
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  const path = issue?.path?.join('.') ?? '';
  return { ok: false, error: `${path ? `${path}: ` : ''}${issue?.message ?? 'invalid input'}` };
}

/** Short human sentence used on the confirmation card and in the receipt list. */
export function describeAction(tool: ToolName, input: Record<string, unknown>): string {
  const t = (key: string) => String(input[key] ?? '');
  switch (tool) {
    case 'create_goal': return `Create the goal "${t('title')}"`;
    case 'update_goal': return 'Update a goal';
    case 'delete_goal': return 'Delete a goal and its milestones';
    case 'create_task': return `Add the task "${t('title')}"`;
    case 'complete_task': return input.done === false ? 'Reopen a task' : 'Complete a task';
    case 'reschedule_task': return `Move a task to ${t('scheduled_date')}`;
    case 'delete_task': return 'Delete a task';
    case 'create_habit': return `Start the habit "${t('title')}"`;
    case 'delete_habit': return 'Delete a habit and its history';
    case 'create_project': return `Create the project "${t('title')}"`;
    case 'delete_project': return 'Delete a project';
    case 'create_event': return `Add "${t('title')}" to your calendar`;
    case 'delete_event': return 'Delete a calendar event';
    case 'reorganize_day': return `Restructure your day (${(input.moves as unknown[] | undefined)?.length ?? 0} moves)`;
    case 'replan_week': return `Replan your week (${(input.moves as unknown[] | undefined)?.length ?? 0} moves)`;
    case 'generate_90_day_plan': return 'Build a 90-day plan';
    case 'create_weekly_plan': return 'Write your weekly plan';
    case 'create_daily_plan': return "Set today's priorities";
    case 'remember': return `Remember: ${t('value')}`;
    case 'forget': return `Forget "${t('key')}"`;
    case 'create_reminder': return `Remind you at ${t('remind_at').replace('T', ' ')}`;
    case 'create_reflection': return 'Save your reflection';
    case 'update_user_preference': return 'Update your planning preferences';
    case 'complete_onboarding': return 'Finish your life interview';
    default: return tool.replace(/_/g, ' ');
  }
}
