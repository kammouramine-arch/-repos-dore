import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppRuntimeProvider, createAppRuntime } from '@/app/runtime/AppRuntime';
import { SplashOverlay } from '@/features/splash/ui/SplashOverlay';
import { colors } from '@/ui/theme';
import { bootstrapApp } from './bootstrap';
import { navigationTheme } from './navigation/navigationTheme';
import { RootNavigator } from './navigation/RootNavigator';

// Hold the native splash until React has something to show, so the handover to
// Nova's own splash is a cross-fade rather than a white flash.
void SplashScreen.preventAutoHideAsync();

export const App = () => {
  // The service graph and every store, built exactly once per app instance.
  // Nothing is constructed at import time, so a test can mount this tree with
  // its own runtime and no module mocking.
  const [runtime] = useState(createAppRuntime);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    void bootstrapApp(runtime).finally(() => setBootstrapped(true));
  }, [runtime]);

  const onLayout = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <AppRuntimeProvider runtime={runtime}>
      <SafeAreaProvider>
        <StatusBar style="light" />

        <View style={styles.root} onLayout={onLayout}>
          {bootstrapped ? (
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          ) : null}

          {splashVisible ? (
            <SplashOverlay
              ready={bootstrapped}
              onFinished={() => setSplashVisible(false)}
            />
          ) : null}
        </View>
      </SafeAreaProvider>
    </AppRuntimeProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
