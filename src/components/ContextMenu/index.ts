/**
 * ContextMenu - 跨平台上下文菜單組件
 * 
 * 使用方法：
 * ```jsx
 * import ContextMenu from '../components/ContextMenu';
 * 
 * <ContextMenu
 *   items={[
 *     { id: 'edit', title: '編輯' },
 *     { id: 'delete', title: '刪除', destructive: true },
 *   ]}
 *   onSelect={({ nativeEvent: { event } }) => {
 *     console.log('選中了:', event);
 *   }}
 * >
 *   <Pressable>
 *     <Text>點擊打開菜單</Text>
 *   </Pressable>
 * </ContextMenu>
 * ```
 * 
 * @module ContextMenu
 */

export { default } from './ContextMenu';
export type { MenuItem, SelectEvent, ContextMenuProps } from './ContextMenu';
