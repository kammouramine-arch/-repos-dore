import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ChatMessage } from '@/components/ChatMessage';
import { TaskRow } from '@/components/TaskRow';
import { EmptyState } from '@/components/ui';
import { LimitReached } from '@/components/LimitReached';
import { UsageMeter } from '@/components/UsageMeter';
import type { AiActionReceipt, Task } from '@/types/database';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const task: Task = {
  id: 't1',
  user_id: 'u1',
  life_area_id: null,
  goal_id: null,
  project_id: null,
  habit_id: null,
  title: 'Finish the business proposal',
  notes: null,
  scheduled_date: '2026-03-10',
  scheduled_time: '15:30:00',
  duration_minutes: 90,
  priority: 'high',
  energy: 'high',
  status: 'todo',
  is_focus: true,
  order_index: 0,
  source: 'ai',
  completed_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('ChatMessage receipts', () => {
  it('shows what the assistant actually did', async () => {
    const actions: AiActionReceipt[] = [
      { tool: 'create_task', status: 'succeeded', summary: 'Added "Call the bank" on 2026-03-11' },
    ];
    const view = await wrap(<ChatMessage role="assistant" content="Added it for tomorrow." actions={actions} />);

    expect(view.getByText('Added it for tomorrow.')).toBeTruthy();
    expect(view.getByText('Added "Call the bank" on 2026-03-11')).toBeTruthy();
  });

  it('shows a failed action as failed rather than hiding it', async () => {
    const actions: AiActionReceipt[] = [
      { tool: 'complete_task', status: 'failed', summary: 'That task does not exist', error: 'missing' },
    ];
    const view = await wrap(<ChatMessage role="assistant" content="I could not complete that." actions={actions} />);
    expect(view.getByText('That task does not exist')).toBeTruthy();
  });

  it('asks for approval before a destructive action, and does not claim it happened', async () => {
    const onResolve = jest.fn();
    const actions: AiActionReceipt[] = [
      { tool: 'delete_goal', status: 'awaiting_confirmation', summary: 'Delete a goal and its milestones' },
    ];
    const view = await wrap(
      <ChatMessage
        role="assistant"
        content="I can remove that goal — confirm and it is gone."
        actions={actions}
        onResolve={onResolve}
      />,
    );

    expect(view.getByText('Needs your approval')).toBeTruthy();
    await fireEvent.press(view.getByText('Do it'));
    expect(onResolve).toHaveBeenCalledWith(0, true);

    await fireEvent.press(view.getByText('Cancel'));
    expect(onResolve).toHaveBeenCalledWith(0, false);
  });

  it('turns a plan-gated action into an offer, not a raw error code', async () => {
    const actions: AiActionReceipt[] = [
      {
        tool: 'generate_90_day_plan',
        status: 'failed',
        summary: 'That is part of Plus',
        error: 'not_entitled',
        upgrade_name: 'Plus',
        upgrade_to: 'plus',
      },
    ];
    const view = await wrap(
      <ChatMessage role="assistant" content="That one is part of Plus." actions={actions} />,
    );
    expect(view.getByText('Not done — part of Plus')).toBeTruthy();
    expect(view.getByText('See Plus')).toBeTruthy();
  });
});

describe('TaskRow', () => {
  it('renders the task with its time and duration', async () => {
    const view = await wrap(<TaskRow task={task} />);
    expect(view.getByText('Finish the business proposal')).toBeTruthy();
    expect(view.getByText('15:30')).toBeTruthy();
    expect(view.getByText('1h 30m')).toBeTruthy();
  });

  it('toggles completion through an accessible checkbox', async () => {
    const onToggle = jest.fn();
    const view = await wrap(<TaskRow task={task} onToggle={onToggle} />);

    const checkbox = view.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(checkbox);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('marks a completed task as checked for screen readers', async () => {
    const view = await wrap(<TaskRow task={{ ...task, status: 'done' }} onToggle={jest.fn()} />);
    expect(view.getByRole('checkbox').props.accessibilityState.checked).toBe(true);
  });
});

describe('LimitReached', () => {
  it('offers an upgrade without suggesting anything is taken away', async () => {
    const view = await wrap(
      <LimitReached
        kind="quota_exceeded"
        upgradeName="Plus"
        resetsAt="2026-04-01"
        message="You have used your Free allowance for this period."
      />,
    );

    expect(view.getByText("You've reached your current AI limit.")).toBeTruthy();
    expect(view.getByText('Upgrade to Plus')).toBeTruthy();
    // The promise that matters: their own data is never held hostage.
    expect(
      view.getByText(/goals, tasks, habits, projects, calendar and Life Map are open/i),
    ).toBeTruthy();
  });

  it('explains a capability gate differently from a spent allowance', async () => {
    const view = await wrap(<LimitReached kind="not_entitled" upgradeName="Pro" />);
    expect(view.getByText('That needs a different plan.')).toBeTruthy();
    expect(view.getByText('Upgrade to Pro')).toBeTruthy();
  });
});

describe('UsageMeter', () => {
  const quota = {
    meter: 'ai_requests' as const,
    label: 'AI conversations',
    unit: 'requests',
    limit: 120,
    used: 90,
    remaining: 30,
    percentRemaining: 25,
    fairUse: false,
    included: true,
    description: '120 requests a month',
  };

  it('leads with how much is left and when it comes back', async () => {
    const view = await wrap(<UsageMeter headline={quota} resetsAt="2026-04-01" />);
    expect(view.getByText('25%')).toBeTruthy();
    expect(view.getByText(/30 of 120 requests left/)).toBeTruthy();
  });

  it('says fair use rather than counting down a generous allowance', async () => {
    const view = await wrap(
      <UsageMeter headline={{ ...quota, fairUse: true }} resetsAt={null} />,
    );
    expect(view.getByText(/high limits on your plan, subject to fair use/i)).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('says something human rather than "no data found"', async () => {
    const view = await wrap(<EmptyState title="Your day is clear." body="Tell me what matters." />);
    expect(view.getByText('Your day is clear.')).toBeTruthy();
    expect(view.queryByText(/no data/i)).toBeNull();
  });
});
