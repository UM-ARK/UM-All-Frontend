# ContextMenu 跨平台組件

自動適配 iOS 和 Android 的原生上下文菜單組件。

## **特性**

- **iOS**: 使用 `@expo/ui/swift-ui` 的原生 ContextMenu
- **Android**: 使用 `@expo/ui/jetpack-compose` 的原生 ContextMenu
- **統一 API**: 無需關心平台差異，一套代碼雙端運行

## 安裝

已經集成在項目中，無需額外安裝。

## 基礎用法

```javascript
import ContextMenu from '../components/ContextMenu';
import { Pressable, Text, Alert } from 'react-native';

function MyComponent() {
    const menuItems = [
        { id: 'edit', title: '編輯', image: 'pencil' },
        { id: 'share', title: '分享', image: 'square.and.arrow.up' },
        { id: 'delete', title: '刪除', destructive: true, image: 'trash' },
    ];

    const handleSelect = ({ nativeEvent: { event } }) => {
        // event 就是被選中項目的 id
        switch (event) {
            case 'edit':
                console.log('編輯');
                break;
            case 'delete':
                Alert.alert('刪除', '確定要刪除嗎？');
                break;
        }
    };

    return (
        <ContextMenu
            items={menuItems}
            onSelect={handleSelect}
        >
            <Pressable style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
                <Text>點擊打開菜單</Text>
            </Pressable>
        </ContextMenu>
    );
}
```

## 與主題集成

```javascript
import ContextMenu from '../components/ContextMenu';
import { useTheme } from '../ThemeContext';

function ThemedMenu() {
    const { theme } = useTheme();

    const menuItems = [
        { id: 'view', title: '查看詳情', image: 'eye' },
        { id: 'delete', title: '刪除項目', destructive: true, image: 'trash' },
    ];

    return (
        <ContextMenu items={menuItems}>
            <Pressable style={{ backgroundColor: theme.tonal.primary08, padding: 16 }}>
                <Text style={{ color: theme.themeColor }}>長按或點擊</Text>
            </Pressable>
        </ContextMenu>
    );
}
```

## API 文檔

### Props

| 屬性 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `children` | ReactElement | ✅ | 觸發菜單的子元素（必須是可點擊的） |
| `items` | MenuItem[] | ✅ | 菜單項配置數組 |
| `onSelect` | (event) => void | ❌ | 選中菜單項時的回調 |
| `onOpen` | () => void | ❌ | 菜單打開時的回調 |
| `onClose` | () => void | ❌ | 菜單關閉時的回調 |
| `style` | any | ❌ | 容器樣式 |

### MenuItem

| 屬性 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一標識符（選中時返回） |
| `title` | string | ✅ | 顯示標題 |
| `subtitle` | string | ❌ | 副標題（僅 iOS） |
| `destructive` | boolean | ❌ | 是否為危險操作（紅色顯示） |
| `disabled` | boolean | ❌ | 是否禁用 |
| `image` | string | ❌ | 系統圖標名稱 |
| `imageColor` | string | ❌ | 圖標顏色 |
| `options` | string[] | ❌ | Picker 選項（僅 Android） |
| `selectedIndex` | number | ❌ | 當前選中的選項索引 |

## 注意事項

1. **iOS 系統圖標**: `image` 屬性使用 iOS 系統圖標名稱，如 `pencil`, `trash`, `square.and.arrow.up` 等。完整列表見 [SF Symbols](https://developer.apple.com/sf-symbols/)

2. **原生實現**: iOS 和 Android 均使用 `@expo/ui` 提供的原生組件，確保最佳的性能和用戶體驗

3. **性能**: 菜單項應該是靜態的或緩存好的數據，避免每次渲染都重新創建

4. **樣式**: 組件會自動適應 iOS/Android 的平台風格，不需要手動設置 Platform.Select

## 更新日誌

### 2026-02-11
- 初始版本
- 支持 iOS (@react-native-menu/menu) 和 Android (@expo/ui)
- 統一的 API 接口
