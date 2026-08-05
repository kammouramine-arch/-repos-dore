import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Nova's routes carry no parameters: the destination, the plan and the live
 * trip live in stores that several screens read at once. Navigation stays
 * about *where the driver is*, not about moving data around.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Search: undefined;
  RoutePreview: undefined;
  Guidance: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<TRoute extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, TRoute>;

/** Makes `useNavigation()` typed everywhere without passing generics around. */
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
