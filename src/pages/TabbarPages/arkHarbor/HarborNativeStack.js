import { createTabNativeStack } from '../../../navigation/createTabNativeStack';

/**
 * iOS 論壇分頁內建原生 Native Stack：
 * 讓首頁與所有子頁共用同一條原生 UINavigationBar，
 * 側滑返回時不再切換 navigationBarHidden，避免標題列偏移。
 */
export const createHarborNativeStack = HomeComponent =>
    createTabNativeStack({
        homeRouteName: 'HarborFeedHome',
        HomeComponent,
        inDrawer: true,
        getHomeOptions: ({ isExpanded }) => ({
            headerShown: !isExpanded,
        }),
    });
