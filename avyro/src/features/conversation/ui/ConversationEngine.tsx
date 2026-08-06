import { useConversationEngine } from '../hooks/useConversationEngine';

/**
 * Mounts the conversation engine for the life of the app.
 *
 * Renders nothing. It exists because the engine is a long-lived subscription,
 * not a screen: guidance can speak from anywhere, and the wake phrase has to be
 * heard wherever the driver happens to be.
 */
export const ConversationEngine = (): null => {
  useConversationEngine();
  return null;
};
