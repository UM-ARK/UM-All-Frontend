import { gestureHandlerRootHOC } from 'react-native-gesture-handler';
import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import './src/i18n/i18n';

// 關閉模擬器內的黃色警告
LogBox.ignoreLogs(['Warning: ...']);    // Ignore log notification by message
LogBox.ignoreAllLogs();                 // Ignore all log notifications

AppRegistry.registerComponent(appName, () => gestureHandlerRootHOC(App));