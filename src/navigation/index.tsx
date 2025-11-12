import { NavigationContainer, type Theme, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Register from '../../app/(Auth)/Register';
import Login from '../../app/(Auth)/Login';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation({ theme, linking, onReady }: { theme?: Theme; linking?: LinkingOptions<RootStackParamList>; onReady?: () => void }) {
  return (
    <NavigationContainer theme={theme} linking={linking} onReady={onReady}>
      <Stack.Navigator initialRouteName="Register" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
