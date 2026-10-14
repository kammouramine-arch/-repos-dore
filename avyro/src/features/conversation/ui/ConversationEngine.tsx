import { useConversationEngine } from '../hooks/useConversationEngine';
import { VoiceHud } from './VoiceHud';
import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { usePreferencesStore } from '@/app/stores/hooks';
import { useServices } from '@/app/runtime/AppRuntime';

/**
 * Mounts the conversation engine for the life of the app, and shows what it
 * is doing.
 *
 * The engine is a long-lived subscription rather than a screen: guidance can
 * speak from anywhere, and the wake phrase has to be heard wherever the driver
 * happens to be. The HUD rides along with it for the same reason — the state
 * of the microphone is not the property of any one screen.
 */
export const ConversationEngine = () => {
  useConversationEngine();
  const awake = usePreferencesStore(state => state.preferences.voiceCommands && state.preferences.keepScreenAwake);
  const { logger } = useServices();
  useEffect(() => {
    const tag = 'avyro-hands-free';
    let active = true;
    if (awake) void activateKeepAwakeAsync(tag).then(() => { if (!active) void deactivateKeepAwake(tag); }).catch(() => logger.warn('Screen-awake request unavailable'));
    return () => { active = false; void deactivateKeepAwake(tag); };
  }, [awake, logger]);
  return <VoiceHud />;
};
