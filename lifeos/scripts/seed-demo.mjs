#!/usr/bin/env node
/**
 * Creates a realistic demo account so the app can be explored immediately.
 *
 *   npm run seed:demo                 # create (or refresh) the demo account on Free
 *   npm run seed:demo -- --plan=plus  # ...on a paid plan, to see the paid experience
 *   npm run seed:demo -- --clear      # remove the demo account and everything in it
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (a local
 * `supabase start` prints both). The service role key is only ever used here, from a
 * developer machine — it is never part of the app.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

const DEMO_EMAIL = 'alex@demo.lifeos.app';
const DEMO_PASSWORD = 'demo-password-1234';

// Allow a plain .env file for convenience during local development.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const iso = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

async function findDemoUser() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data?.users?.find((u) => u.email === DEMO_EMAIL) ?? null;
}

async function clear() {
  const user = await findDemoUser();
  if (!user) {
    console.log('No demo account found — nothing to remove.');
    return;
  }
  await admin.auth.admin.deleteUser(user.id);
  console.log(`Removed the demo account (${DEMO_EMAIL}). Every row cascaded with it.`);
}

async function seed() {
  const existing = await findDemoUser();
  if (existing) {
    console.log('Demo account already exists — removing it first so the data is fresh.');
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Alex Moreau' },
  });
  if (error) throw error;
  const userId = created.user.id;

  // The new-user trigger has already created the profile, preferences and life areas.
  await admin
    .from('profiles')
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);

  // Optional paid plan, so the subscription experience can be seen without a store.
  const planArg = process.argv.find((a) => a.startsWith('--plan='));
  const plan = planArg ? planArg.split('=')[1] : 'free';
  if (['plus', 'pro', 'ultra'].includes(plan)) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await admin
      .from('subscriptions')
      .update({
        tier: plan,
        status: 'active',
        provider: 'promo',
        platform: 'promo',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        will_renew: true,
      })
      .eq('user_id', userId);
  }

  const { data: areas } = await admin.from('life_areas').select('id, key').eq('user_id', userId);
  const area = (key) => areas?.find((a) => a.key === key)?.id ?? null;

  const { data: goals } = await admin
    .from('goals')
    .insert([
      {
        user_id: userId,
        life_area_id: area('health'),
        title: 'Get fit again',
        why: 'I want to stop feeling tired by 3pm.',
        target_date: iso(120),
        priority: 'high',
        strategy: [
          { title: 'Three sessions a week, no more', detail: 'Consistency beats intensity for the first month.' },
          { title: 'Walk 8k steps on non-gym days' },
          { title: 'Sleep before 23:30 on weeknights' },
        ],
      },
      {
        user_id: userId,
        life_area_id: area('money'),
        title: 'Save €10,000',
        why: 'A buffer so a bad month is not a crisis.',
        target_date: iso(200),
        priority: 'high',
        strategy: [
          { title: 'Automate €800 a month on payday' },
          { title: 'Cut two subscriptions' },
          { title: 'Review the budget monthly' },
        ],
      },
      {
        user_id: userId,
        life_area_id: area('career'),
        title: 'Launch the side business',
        why: 'I want income that is not tied to one employer.',
        target_date: iso(90),
        priority: 'medium',
        strategy: [
          { title: 'Validate the idea with 10 conversations' },
          { title: 'Build a small version, not the full thing' },
          { title: 'Get the first five paying users' },
        ],
      },
    ])
    .select('id, title');

  const goalId = (title) => goals?.find((g) => g.title === title)?.id ?? null;

  await admin.from('goal_milestones').insert([
    { user_id: userId, goal_id: goalId('Get fit again'), title: 'Four weeks without missing two in a row', due_date: iso(28), sort_order: 0 },
    { user_id: userId, goal_id: goalId('Get fit again'), title: 'Run 5k without stopping', due_date: iso(60), sort_order: 1 },
    { user_id: userId, goal_id: goalId('Save €10,000'), title: 'First €2,500 saved', due_date: iso(60), is_done: true, sort_order: 0 },
    { user_id: userId, goal_id: goalId('Save €10,000'), title: 'Halfway — €5,000', due_date: iso(120), sort_order: 1 },
    { user_id: userId, goal_id: goalId('Launch the side business'), title: 'Ten validation conversations done', due_date: iso(21), sort_order: 0 },
    { user_id: userId, goal_id: goalId('Launch the side business'), title: 'First version live', due_date: iso(60), sort_order: 1 },
  ]);

  const { data: projects } = await admin
    .from('projects')
    .insert([
      {
        user_id: userId,
        life_area_id: area('career'),
        goal_id: goalId('Launch the side business'),
        title: 'Business launch',
        description: 'Everything between the idea and the first five paying users.',
        due_date: iso(90),
      },
    ])
    .select('id');

  const projectId = projects?.[0]?.id ?? null;

  await admin.from('project_milestones').insert([
    { user_id: userId, project_id: projectId, title: 'Decide the offer', due_date: iso(10), is_done: true, sort_order: 0 },
    { user_id: userId, project_id: projectId, title: 'Talk to ten people', due_date: iso(21), sort_order: 1 },
    { user_id: userId, project_id: projectId, title: 'Ship the first version', due_date: iso(55), sort_order: 2 },
    { user_id: userId, project_id: projectId, title: 'First five paying users', due_date: iso(85), sort_order: 3 },
  ]);

  const { data: habits } = await admin
    .from('habits')
    .insert([
      { user_id: userId, life_area_id: area('health'), goal_id: goalId('Get fit again'), title: 'Gym', cadence: 'weekly', target_per_week: 3, preferred_time: '18:00', duration_minutes: 60 },
      { user_id: userId, life_area_id: area('growth'), title: 'Read before bed', cadence: 'daily', target_per_week: 7, preferred_time: '21:30', duration_minutes: 20 },
      { user_id: userId, life_area_id: area('health'), title: 'Lights out by 23:30', cadence: 'daily', target_per_week: 7, preferred_time: '23:15', duration_minutes: 5 },
    ])
    .select('id, title');

  const habitId = (title) => habits?.find((h) => h.title === title)?.id ?? null;

  // Two weeks of plausible history: good but not perfect.
  const logs = [];
  for (let day = 14; day >= 1; day -= 1) {
    const date = iso(-day);
    if (day % 2 === 0) logs.push({ user_id: userId, habit_id: habitId('Gym'), date, status: 'done' });
    if (day % 5 !== 0) logs.push({ user_id: userId, habit_id: habitId('Read before bed'), date, status: 'done' });
    if (day % 3 !== 0) logs.push({ user_id: userId, habit_id: habitId('Lights out by 23:30'), date, status: 'done' });
  }
  await admin.from('habit_logs').insert(logs);

  await admin.from('tasks').insert([
    { user_id: userId, title: 'Finish the business proposal', scheduled_date: iso(0), scheduled_time: '10:00', duration_minutes: 90, priority: 'high', is_focus: true, goal_id: goalId('Launch the side business'), project_id: projectId, life_area_id: area('career') },
    { user_id: userId, title: 'Call the bank about the savings account', scheduled_date: iso(0), scheduled_time: '15:30', duration_minutes: 20, priority: 'high', is_focus: true, goal_id: goalId('Save €10,000'), life_area_id: area('money') },
    { user_id: userId, title: 'Gym session', scheduled_date: iso(0), scheduled_time: '18:00', duration_minutes: 60, priority: 'medium', is_focus: true, habit_id: habitId('Gym'), life_area_id: area('health') },
    { user_id: userId, title: 'Reply to the supplier email', scheduled_date: iso(0), duration_minutes: 15, priority: 'medium', project_id: projectId },
    { user_id: userId, title: 'Cancel the unused subscriptions', scheduled_date: iso(1), duration_minutes: 20, priority: 'medium', goal_id: goalId('Save €10,000') },
    { user_id: userId, title: 'Two validation calls', scheduled_date: iso(1), scheduled_time: '11:00', duration_minutes: 60, priority: 'high', project_id: projectId },
    { user_id: userId, title: 'Plan the weekly food shop', scheduled_date: iso(2), duration_minutes: 30, priority: 'low', life_area_id: area('health') },
    { user_id: userId, title: 'Draft the landing page copy', scheduled_date: iso(3), duration_minutes: 90, priority: 'medium', project_id: projectId },
    { user_id: userId, title: 'Review the budget', scheduled_date: iso(4), duration_minutes: 45, priority: 'medium', goal_id: goalId('Save €10,000') },
    { user_id: userId, title: 'Book the dentist', duration_minutes: 10, priority: 'low' },
    { user_id: userId, title: 'Research accounting software', duration_minutes: 45, priority: 'low', project_id: projectId },
    { user_id: userId, title: 'Morning walk', scheduled_date: iso(-1), duration_minutes: 30, status: 'done', life_area_id: area('health') },
    { user_id: userId, title: 'Weekly review', scheduled_date: iso(-1), duration_minutes: 30, status: 'done' },
  ]);

  await admin.from('calendar_events').insert([
    { user_id: userId, title: 'Team stand-up', starts_at: `${iso(0)}T09:15:00`, ends_at: `${iso(0)}T09:30:00` },
    { user_id: userId, title: 'Dentist', starts_at: `${iso(2)}T14:00:00`, ends_at: `${iso(2)}T15:00:00`, location: 'Rue Lafayette' },
    { user_id: userId, title: 'Dinner with Sam', starts_at: `${iso(3)}T19:30:00`, ends_at: `${iso(3)}T21:30:00` },
  ]);

  await admin.from('daily_plans').insert([
    {
      user_id: userId,
      date: iso(0),
      headline: 'A busy day, but your three priorities are clear.',
      summary:
        'Stand-up at 09:15, then the proposal while your head is fresh. The bank call is short but it unblocks the savings plan. Gym at 18:00 as usual.',
      focus: [
        { title: 'Finish the business proposal' },
        { title: 'Call the bank' },
        { title: 'Gym session' },
      ],
      capacity_minutes: 240,
    },
  ]);

  await admin.from('reflections').insert([
    {
      user_id: userId,
      date: iso(-1),
      kind: 'daily_reset',
      raw_text: 'Long day at work, got the walk in but not the reading. Felt behind on the business.',
      mood: 3,
      energy: 2,
      wins: ['Walked in the morning', 'Cleared the inbox'],
      obstacles: ['Meetings ran over', 'Started the deep work too late'],
      lessons: ['Deep work before 11 or it does not happen'],
    },
  ]);

  await admin.from('ai_memory').insert([
    { user_id: userId, kind: 'schedule', key: 'work_hours', value: 'Works 09:00–18:00, Monday to Friday.', importance: 5 },
    { user_id: userId, kind: 'routine', key: 'gym_days', value: 'Prefers the gym Tuesday, Thursday and Saturday at 18:00.', importance: 4 },
    { user_id: userId, kind: 'constraint', key: 'evenings_tuesday', value: 'Tuesday evenings are for family — do not schedule work.', importance: 5 },
    { user_id: userId, kind: 'preference', key: 'deep_work_window', value: 'Focuses best between 09:00 and 11:30.', importance: 4 },
    { user_id: userId, kind: 'value', key: 'why_business', value: 'Wants income independent of one employer.', importance: 3 },
  ]);

  console.log(
    `Demo account ready on the ${plan} plan.\n  email:    ${DEMO_EMAIL}\n  password: ${DEMO_PASSWORD}\n\nRemove it with: npm run seed:demo -- --clear`,
  );
}

const clearing = process.argv.includes('--clear');
try {
  await (clearing ? clear() : seed());
} catch (error) {
  console.error('Seeding failed:', error.message ?? error);
  process.exit(1);
}
