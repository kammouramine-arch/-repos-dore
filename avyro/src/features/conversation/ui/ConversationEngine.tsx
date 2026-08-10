import { useConversationEngine } from '../hooks/useConversationEngine';
import { VoiceHud } from './VoiceHud';

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
  return <VoiceHud />;
};
