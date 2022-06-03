/**
 * @format
 */

import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);

// VSCode運行
// 要用CMD或者PowerShell運行
// react-native run-android