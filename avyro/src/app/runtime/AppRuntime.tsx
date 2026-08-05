import { createContext, useContext, type ReactNode } from 'react';

import type { AppStores } from '@/app/stores/createStores';
import { createStores } from '@/app/stores/createStores';
import {
  createServiceContainer,
  type ServiceContainer,
  type ServiceOverrides,
} from '@/services/container';

/**
 * Everything the app is built from: the service graph and the state built on
 * top of it. Created once, in bootstrap, and passed down — never imported.
 */
export interface AppRuntime {
  services: ServiceContainer;
  stores: AppStores;
}

export const createAppRuntime = (overrides: ServiceOverrides = {}): AppRuntime => {
  const services = createServiceContainer(overrides);
  return { services, stores: createStores(services) };
};

const RuntimeContext = createContext<AppRuntime | null>(null);

export interface AppRuntimeProviderProps {
  runtime: AppRuntime;
  children: ReactNode;
}

export const AppRuntimeProvider = ({ runtime, children }: AppRuntimeProviderProps) => (
  <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
);

export const useAppRuntime = (): AppRuntime => {
  const runtime = useContext(RuntimeContext);

  if (!runtime) {
    throw new Error(
      'No AppRuntime in context. Render the tree inside <AppRuntimeProvider>.',
    );
  }

  return runtime;
};

/** The service graph, for hooks that talk to adapters or use cases directly. */
export const useServices = (): ServiceContainer => useAppRuntime().services;

/** The store bag, for imperative reads (`getState`) outside of a subscription. */
export const useStores = (): AppStores => useAppRuntime().stores;
