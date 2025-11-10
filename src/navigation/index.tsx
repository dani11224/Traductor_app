import { createStaticNavigation, StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Register from '../(Auth)/Register';

const RootStack = createNativeStackNavigator({
  screens: {
    Register: {
      screen: Register,
      options: { headerShown: false },
    },
  },
  initialRouteName: 'Register',
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
