import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import App from './App';
import './src/i18n/i18n';
// import { scale, verticalScale } from 'react-native-size-matters';

// 覆蓋原有的 scale 和 verticalScale，使其返回整數
// const originalScale = scale;
// const originalVerticalScale = verticalScale;
// global.scale = (size) => Math.round(originalScale(size));
// global.verticalScale = (size) => Math.round(originalVerticalScale(size));

// 關閉模擬器內的黃色警告
LogBox.ignoreLogs(['Warning: ...']);
LogBox.ignoreAllLogs();

// 創建包裝組件
const RootApp = () => (
    <GestureHandlerRootView>
        <App />
    </GestureHandlerRootView>
);

registerRootComponent(RootApp);
