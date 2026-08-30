import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemeProvider } from '@/theme';
import { ChatMessage } from '@/components/ChatMessage';
import { Markdown } from '@/components/chat/Markdown';
import { Composer } from '@/components/Composer';
import { relativeTimestamp } from '@/utils/date';

const mockVoice = {
  state: 'idle' as string,
  error: null as string | null,
  startedAt: null as number | null,
  start: jest.fn(async () => true),
  stop: jest.fn(async () => 'spoken words'),
  cancel: jest.fn(async () => undefined),
  clearError: jest.fn(),
};
jest.mock('@/hooks/useVoice', () => ({ useVoice: () => mockVoice }));

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
  mockVoice.state = 'idle';
  mockVoice.error = null;
  mockVoice.startedAt = null;
  mockVoice.start.mockClear();
  mockVoice.stop.mockClear();
  mockVoice.cancel.mockClear();
  (Clipboard.setStringAsync as jest.Mock).mockClear();
});

describe('Markdown rendering', () => {
  it('shows formatted text without its markup', async () => {
    const view = await wrap(<Markdown content={'## Your week\n\n- **Ship** the thing\n- Rest'} />);
    await view.findByText('Your week');
    // The asterisks and dashes are gone; the words survive.
    await view.findByText('Ship');
    expect(view.queryByText(/\*\*/)).toBeNull();
    expect(view.queryByText('## Your week')).toBeNull();
  });

  it('renders a fenced code block verbatim', async () => {
    const view = await wrap(<Markdown content={'```\nnpm run build\n```'} />);
    await view.findByText('npm run build');
  });
});

describe('ChatMessage', () => {
  it('shows what the user typed literally, without interpreting markup', async () => {
    const view = await wrap(<ChatMessage role="user" content="check life_area_key *now*" />);
    await view.findByText('check life_area_key *now*');
  });

  it('copies the plain text of a reply, not its markdown', async () => {
    const view = await wrap(<ChatMessage role="assistant" content={'Do **this** first'} />);
    const copy = await view.findByLabelText('Copy');
    // The copy handler awaits the clipboard write before setting its confirmation
    // state, so the press has to be flushed inside act.
    await act(async () => {
      fireEvent.press(copy);
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Do this first');
    await view.findByLabelText('Copied');
  });

  it('offers retry only when a handler is given', async () => {
    const plain = await wrap(<ChatMessage role="assistant" content="hello" />);
    expect(plain.queryByLabelText('Retry')).toBeNull();

    const onRetry = jest.fn();
    const withRetry = await wrap(<ChatMessage role="assistant" content="hello" onRetry={onRetry} />);
    fireEvent.press(await withRetry.findByLabelText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('still renders the action receipts that prove work was done', async () => {
    const view = await wrap(
      <ChatMessage
        role="assistant"
        content="Added it."
        actions={[{ tool: 'create_goal', status: 'succeeded', summary: 'Created goal "Run 5k"' }] as never}
      />,
    );
    await view.findByText('Created goal "Run 5k"');
  });

  it('asks for approval before an action that needs it', async () => {
    const onResolve = jest.fn();
    const view = await wrap(
      <ChatMessage
        role="assistant"
        content="I can do that."
        actions={[{ tool: 'delete_goal', status: 'awaiting_confirmation', summary: 'Delete "Run 5k"' }] as never}
        onResolve={onResolve}
      />,
    );
    await view.findByText('Needs your approval');
    fireEvent.press(view.getByText('Do it'));
    expect(onResolve).toHaveBeenCalledWith(0, true);
  });
});

describe('Composer', () => {
  it('sends the trimmed text and clears the field', async () => {
    const onSend = jest.fn();
    const view = await wrap(<Composer onSend={onSend} />);
    const input = view.getByLabelText('Message');

    fireEvent.changeText(input, '  what should I do today?  ');
    fireEvent.press(await view.findByLabelText('Send'));

    expect(onSend).toHaveBeenCalledWith('what should I do today?');
    await waitFor(() => expect(view.getByLabelText('Message').props.value).toBe(''));
  });

  it('will not send an empty or whitespace-only message', async () => {
    const onSend = jest.fn();
    const view = await wrap(<Composer onSend={onSend} />);
    fireEvent.changeText(view.getByLabelText('Message'), '    ');
    // Whitespace does not count as text, so the control stays the microphone and
    // there is nothing that could send a blank message.
    await view.findByLabelText('Record a voice message');
    expect(view.queryByLabelText('Send')).toBeNull();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send while a reply is still in flight', async () => {
    const onSend = jest.fn();
    const view = await wrap(<Composer onSend={onSend} busy />);
    fireEvent.changeText(view.getByLabelText('Message'), 'again');
    fireEvent.press(await view.findByLabelText('Waiting for a reply'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('offers the microphone only while the box is empty', async () => {
    const view = await wrap(<Composer onSend={jest.fn()} />);
    await view.findByLabelText('Record a voice message');
    fireEvent.changeText(view.getByLabelText('Message'), 'typed');
    await view.findByLabelText('Send');
    expect(view.queryByLabelText('Record a voice message')).toBeNull();
  });

  it('shows a cancellable recording bar while listening', async () => {
    mockVoice.state = 'recording';
    mockVoice.startedAt = Date.now();
    const view = await wrap(<Composer onSend={jest.fn()} />);

    await view.findByText(/Listening/);
    fireEvent.press(view.getByLabelText('Discard recording'));
    expect(mockVoice.cancel).toHaveBeenCalled();
  });

  it('puts the transcript in the box rather than sending it unseen', async () => {
    mockVoice.state = 'recording';
    mockVoice.startedAt = Date.now();
    const onSend = jest.fn();
    const view = await wrap(<Composer onSend={onSend} />);

    await act(async () => {
      fireEvent.press(view.getByLabelText('Stop and transcribe'));
    });

    // Speech recognition mishears names and numbers; a sent message cannot be unsent.
    expect(onSend).not.toHaveBeenCalled();
    mockVoice.state = 'idle';
    view.rerender(<ThemeProvider><Composer onSend={onSend} /></ThemeProvider>);
    await waitFor(() => expect(view.getByLabelText('Message').props.value).toBe('spoken words'));
  });

  it('hides voice entirely when the server cannot transcribe', async () => {
    mockVoice.state = 'unavailable';
    const view = await wrap(<Composer onSend={jest.fn()} />);
    expect(view.queryByLabelText('Record a voice message')).toBeNull();
    // Nothing is faked: the send button is what remains.
    await view.findByLabelText('Send');
  });

  it('reports a voice error in plain language', async () => {
    mockVoice.error = 'Microphone access is off. You can turn it on in system settings.';
    const view = await wrap(<Composer onSend={jest.fn()} />);
    await view.findByText(/Microphone access is off/);
  });
});

describe('relativeTimestamp', () => {
  const now = new Date('2026-03-20T12:00:00.000Z');

  it.each([
    ['2026-03-20T11:59:40.000Z', 'Just now'],
    ['2026-03-20T11:45:00.000Z', '15m ago'],
    ['2026-03-20T09:00:00.000Z', '3h ago'],
    ['2026-03-19T09:00:00.000Z', 'Yesterday'],
  ])('renders %s as %s', (iso, expected) => {
    expect(relativeTimestamp(iso, now)).toBe(expected);
  });

  it('does not show a negative age when the device clock is behind', () => {
    expect(relativeTimestamp('2026-03-20T12:00:30.000Z', now)).toBe('Just now');
  });

  it('returns an empty string for an unparseable value rather than "Invalid Date"', () => {
    expect(relativeTimestamp('not-a-date', now)).toBe('');
  });
});
