import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// React Native Firebase v22 移行警告を一時的に抑制
// TODO: modular API への移行完了後に削除
LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

// コンソールログの警告も抑制
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('This method is deprecated (as well as all React Native Firebase namespaced API)')) {
    return;
  }
  originalWarn(...args);
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
