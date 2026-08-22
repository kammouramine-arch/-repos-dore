import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { writeCache } from '@/lib/cache';
import { brand } from '@/config/brand';

jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ session: null, userId: 'user-1', initialising: false, configured: true }),
}));

function Harness({ fetcher }: { fetcher: () => Promise<string[]> }) {
  const query = useCachedQuery<string[]>(['today'], 'today', fetcher);
  return (
    <Text testID="out">
      {query.isLoading ? 'loading' : `${(query.data ?? []).join(',')}|${query.isFromCache ? 'cache' : 'live'}`}
    </Text>
  );
}

const wrap = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useCachedQuery', () => {
  it('shows server data and writes it to the cache', async () => {
    const view = await wrap(<Harness fetcher={async () => ['from-server']} />);
    await view.findByText('from-server|live');

    // The value is now readable offline.
    const raw = await AsyncStorage.getItem(`${brand.storageNamespace}.cache.v1.user-1.today`);
    expect(raw).toContain('from-server');
  });

  it('falls back to the cached plan when the request fails', async () => {
    await writeCache('user-1', 'today', ['cached-task']);

    const view = await wrap(
      <Harness
        fetcher={async () => {
          throw new Error('Network request failed');
        }}
      />,
    );

    await view.findByText('cached-task|cache');
  });
});
