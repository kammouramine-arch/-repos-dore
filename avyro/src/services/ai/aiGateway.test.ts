import { buildRouteContext } from '@/core/conversation/routeContext';
import type {
  ConversationReply,
  ConversationRequest,
  VoiceIntent,
} from '@/core/domain/entities/conversation';
import type { AiCompletion, AiProvider } from '@/core/domain/ports/aiProvider';
import type {
  ConversationProvider,
  IntentResolver,
} from '@/core/domain/ports/conversationProvider';
import type { CrashReporter } from '@/core/domain/ports/crashReporter';
import type { Logger } from '@/core/domain/ports/logger';
import { createAiGateway } from './aiGateway';

const silentLogger = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    scoped: () => logger,
  };
  return logger;
};

const crashReporter = (): CrashReporter => ({
  captureError: () => undefined,
  addBreadcrumb: () => undefined,
  identify: () => undefined,
});

const reply = (intent: VoiceIntent, speech: string): ConversationReply => ({
  intent,
  speech,
  action: { type: 'none' },
  referent: null,
});

/** Records what the deterministic layer was asked to do. */
const localResolver = () => {
  const resolved: VoiceIntent[] = [];
  let respondIntent: VoiceIntent = { kind: 'unknown' };

  const local: ConversationProvider & IntentResolver = {
    name: 'local-commands',
    async respond() {
      return reply(respondIntent, `local:${respondIntent.kind}`);
    },
    async resolve(intent) {
      resolved.push(intent);
      return reply(intent, `resolved:${intent.kind}`);
    },
  };

  return {
    local,
    resolved,
    understands: (intent: VoiceIntent) => {
      respondIntent = intent;
    },
  };
};

const aiProvider = (
  behaviour: AiCompletion | Error | 'hang',
  configured = true,
): AiProvider => ({
  id: 'test-provider',
  isConfigured: () => configured,
  async complete({ signal }) {
    if (behaviour === 'hang') {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    if (behaviour instanceof Error) throw behaviour;
    return behaviour;
  },
});

const request = (transcript: string): ConversationRequest => ({
  transcript,
  origin: null,
  context: buildRouteContext({
    navigationState: 'idle',
    destination: null,
    route: null,
    progress: null,
    distanceUnit: 'metric',
  }),
});

const build = (provider: AiProvider) => {
  const stub = localResolver();
  const gateway = createAiGateway({
    local: stub.local,
    provider,
    logger: silentLogger(),
    crashReporter: crashReporter(),
  });
  return { gateway, ...stub };
};

describe('deterministic first', () => {
  it('never consults the model for a command the parser understood', async () => {
    let asked = false;
    const provider: AiProvider = {
      id: 'test-provider',
      isConfigured: () => true,
      async complete() {
        asked = true;
        return { intent: null, speech: null };
      },
    };

    const { gateway, understands } = build(provider);
    understands({ kind: 'cancel-navigation' });

    const result = await gateway.respond(request('cancel navigation'));

    // Nothing a model could add is worth the latency, and plenty could be
    // worth the risk.
    expect(asked).toBe(false);
    expect(result.speech).toBe('local:cancel-navigation');
  });

  it('does not consult a model that is not configured', async () => {
    const { gateway } = build(aiProvider({ intent: null, speech: 'hi' }, false));

    const result = await gateway.respond(request('tell me a joke'));
    expect(result.intent.kind).toBe('unknown');
    expect(result.speech).toBe('local:unknown');
  });
});

describe('the model classifies, the app acts', () => {
  it('executes a model intent through the deterministic resolver', async () => {
    const { gateway, resolved } = build(
      aiProvider({ intent: { kind: 'ask-eta' }, speech: null }),
    );

    const result = await gateway.respond(request('are we nearly there'));

    expect(resolved).toEqual([{ kind: 'ask-eta' }]);
    expect(result.speech).toBe('resolved:ask-eta');
  });

  it('discards the model’s prose when it chose an intent', async () => {
    // The deterministic reply is the one that matches what actually happened.
    const { gateway } = build(
      aiProvider({
        intent: { kind: 'cancel-navigation' },
        speech: 'Sure thing, buddy! Cancelling!',
      }),
    );

    const result = await gateway.respond(request('stop this'));
    expect(result.speech).toBe('resolved:cancel-navigation');
  });

  it('speaks the model’s sentence only when it had no intent to offer', async () => {
    const { gateway, resolved } = build(
      aiProvider({ intent: null, speech: 'I cannot do that while driving.' }),
    );

    const result = await gateway.respond(request('read me the news'));

    expect(resolved).toEqual([]);
    expect(result.speech).toBe('I cannot do that while driving.');
  });

  it('treats an unknown classification as no answer at all', async () => {
    const { gateway, resolved } = build(
      aiProvider({ intent: { kind: 'unknown' }, speech: null }),
    );

    const result = await gateway.respond(request('mmm'));

    expect(resolved).toEqual([]);
    expect(result.speech).toBe('local:unknown');
  });
});

describe('failure is a normal path', () => {
  it('falls back to the local reply when the provider throws', async () => {
    const { gateway } = build(aiProvider(new Error('502 from upstream')));

    const result = await gateway.respond(request('something odd'));
    expect(result.speech).toBe('local:unknown');
  });

  it('falls back when the provider never answers', async () => {
    // The deadline is the point: an answer after the junction is not an answer,
    // and a request that never settles would strand the engine in `thinking`.
    jest.useFakeTimers();
    const { gateway } = build(aiProvider('hang'));

    const pending = gateway.respond(request('something slow'));
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toMatchObject({ speech: 'local:unknown' });
    jest.useRealTimers();
  });

  it('always resolves, so navigation is never waiting on it', async () => {
    const { gateway } = build(aiProvider(new Error('offline')));

    await expect(gateway.respond(request('anything'))).resolves.toBeDefined();
  });

  it('names the provider it is fronting, for logs', () => {
    const { gateway } = build(aiProvider({ intent: null, speech: null }));
    expect(gateway.name).toBe('gateway(test-provider)');
  });
});
