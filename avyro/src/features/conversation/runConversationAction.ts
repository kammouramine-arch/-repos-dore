import { navigateWhenReady } from '@/app/navigation/navigationRef';
import type { AppStores } from '@/app/stores/createStores';
import type { ConversationAction } from '@/core/domain/entities/conversation';
import type { Logger } from '@/core/domain/ports/logger';
import type { ServiceContainer } from '@/services/container';

export interface ActionContext {
  services: ServiceContainer;
  stores: AppStores;
  logger: Logger;
}

/**
 * Carries out what a reply promised.
 *
 * Speech and action are deliberately separate: the reply is spoken the moment
 * it is known, and the work happens alongside it. A driver told "heading home"
 * should be watching the route draw itself, not waiting for the sentence to
 * finish before anything moves.
 */
export const runConversationAction = async (
  action: ConversationAction,
  { services, stores, logger }: ActionContext,
): Promise<void> => {
  const { trip, navigation, location } = stores;

  switch (action.type) {
    case 'navigate-to': {
      const origin = location.getState().position?.coordinates;
      if (!origin) {
        logger.warn('cannot navigate without a position');
        return;
      }

      const planned = await trip.getState().planTrip(action.place, origin);
      if (!planned) return;

      const route = trip.getState().plan?.routes[0];
      if (!route) return;

      navigation.getState().start(route, action.place);
      navigateWhenReady('Guidance');
      return;
    }

    case 'cancel-navigation': {
      navigation.getState().stop();
      trip.getState().clearTrip();
      navigateWhenReady('Home');
      return;
    }

    case 'reroute': {
      const destination = navigation.getState().destination;
      const origin = location.getState().position?.coordinates;
      if (!destination || !origin) {
        logger.warn('cannot reroute without a destination and a position');
        return;
      }

      navigation.getState().setStatus('rerouting');

      try {
        const plan = await services.useCases.planTrip({ origin, destination });
        const [next] = plan.routes;
        if (next) navigation.getState().replaceRoute(next);
        else navigation.getState().setStatus('guiding');
      } catch (error) {
        navigation.getState().setStatus('guiding');
        logger.warn('voice reroute failed', { reason: String(error) });
      }
      return;
    }

    case 'none':
      return;
  }
};
