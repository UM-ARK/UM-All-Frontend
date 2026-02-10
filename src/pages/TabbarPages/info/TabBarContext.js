import {createContext, useContext} from 'react';

/**
 * Top Tab Bar 可見性上下文
 * 用於子頁面控制 Material Top Tab Bar 的顯示/隱藏
 */
const TabBarContext = createContext({
    setTabBarHidden: () => {},
});

export const useTabBarVisibility = () => useContext(TabBarContext);
export default TabBarContext;
