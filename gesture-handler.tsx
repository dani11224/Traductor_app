// Import react-native-gesture-handler on native only
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-gesture-handler');
}
