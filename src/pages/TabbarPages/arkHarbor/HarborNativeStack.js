import { createTabNativeStack } from '../../../navigation/createTabNativeStack';

/**
 * iOS 論壇分頁單頁 Native Stack：
 * 僅為論壇 1 級首頁提供原生 UINavigationBar（液態玻璃頂欄與 scrollEdgeEffects），
 * 2 級子頁統一由外層 Root Stack 承接。
 */
export const createHarborNativeStack = HomeComponent =>
    createTabNativeStack({
        homeRouteName: 'HarborFeedHome',
        HomeComponent,
        getHomeOptions: ({ isExpanded }) => ({
            headerShown: !isExpanded,
        }),
    });
