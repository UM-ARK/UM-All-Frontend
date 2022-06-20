/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
// import App from './src/test/test';
import {name as appName} from './app.json';

// 關閉模擬器內的黃色警告
console.ignoredYellowBox = ['Warning: BackAndroid is deprecated. Please use BackHandler instead.','source.uri should not be an empty string','Invalid props.style key'];
console.disableYellowBox = true;

AppRegistry.registerComponent(appName, () => App);
