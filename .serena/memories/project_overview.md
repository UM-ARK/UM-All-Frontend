# UM-All-Frontend 項目概覽

## 項目基本信息
- **名稱**: ARK ALL (umall)
- **版本**: 26.1.1
- **類型**: React Native 移動應用
- **目標用戶**: 澳門大學學生

## 技術棧
- **React Native**: 0.81.5
- **Expo SDK**: 54 (使用 CNG 工作流程)
- **React**: 19.1.0
- **導航**: React Navigation V7
- **狀態管理**: MobX 6.x
- **UI**: React Native Elements, Expo 內置組件

## 項目特點
- **Offline-first 架構**: 支持離線訪問
- **6小時自動更新**: 課程數據自動更新機制
- **Cloudflare Workers API**: 後端API
- **iOS 26 液態玻璃效果**: 使用 @callstack/liquid-glass

## 代碼規範
- **語言**: 繁體中文（注釋和APP文本）
- **主題**: 強制使用 ThemeContext，禁止硬編碼顏色
- **縮放**: 使用 react-native-size-matters
- **命名**: PascalCase(組件), camelCase(函數/變量)

## 關鍵文件位置
- `src/Nav.js` - 主導航配置
- `src/Tabbar.js` - 底部標籤欄（6個主標籤）
- `src/mobx/index.js` - RootStore (MobX)
- `src/utils/pathMap.js` - API 端點常量
- `src/utils/storageKits.js` - AsyncStorage 封裝
- `src/components/ThemeContext.js` - 主題上下文

## 當前進度
- MobX 重構計劃已制定（MOBX_REFACTOR_PLAN.md）
- iOS 啟動屏已設置
- 導航代碼已整理
- React Navigation V7 已升級穩定運行
- Native Bottom Tabs 已集成
