import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { HeaderBackButton } from '@react-navigation/elements';

import ScalePressable from '../components/ScalePressable';
import { trigger } from '../utils/trigger';

import ClubDetail from '../pages/TabbarPages/info/club/ClubDetail';
import EventDetail from '../pages/TabbarPages/info/club/EventDetail';
import NewsDetail from '../pages/TabbarPages/info/news/NewsDetail';
import UMEventDetail from '../pages/TabbarPages/info/news/UMEventDetail';
import AllEvents from '../pages/TabbarPages/info/club/AllEvents';
import SearchScreen from '../pages/TabbarPages/info/home/search/SearchScreen';
import HarborTopicDetail from '../pages/TabbarPages/arkHarbor/HarborTopicDetail';
import {
    HarborCategoryListPage,
    HarborTagListPage,
} from '../pages/TabbarPages/arkHarbor/HarborDirectoryPage';
import HarborSearchPage from '../pages/TabbarPages/arkHarbor/HarborSearchPage';
import HarborTopicListPage from '../pages/TabbarPages/arkHarbor/HarborTopicListPage';
import HarborComposerPage from '../pages/TabbarPages/arkHarbor/HarborComposerPage';
import HarborDraftsPage from '../pages/TabbarPages/arkHarbor/HarborDraftsPage';
import HarborPendingPostDetailPage from '../pages/TabbarPages/arkHarbor/HarborPendingPostDetailPage';
import HarborPendingPostsPage from '../pages/TabbarPages/arkHarbor/HarborPendingPostsPage';
import HarborChatListPage from '../pages/TabbarPages/arkHarbor/HarborChatListPage';
import HarborChatChannelPage from '../pages/TabbarPages/arkHarbor/HarborChatChannelPage';
import HarborReviewQueuePage from '../pages/TabbarPages/arkHarbor/review/HarborReviewQueuePage';
import HarborAccountSettingsPage from '../pages/TabbarPages/my/pages/HarborAccountSettingsPage';
import HarborProfilePage from '../pages/TabbarPages/my/pages/HarborProfilePage';
import HarborActivityPage from '../pages/TabbarPages/my/pages/HarborActivityPage';
import HarborBadgesPage from '../pages/TabbarPages/my/pages/HarborBadgesPage';
import HarborInboxPage from '../pages/TabbarPages/my/pages/HarborInboxPage';
import TeamScheduleListPage from '../pages/TeamSchedule/TeamScheduleListPage';
import TeamScheduleCreatePage from '../pages/TeamSchedule/TeamScheduleCreatePage';
import TeamScheduleDetailPage from '../pages/TeamSchedule/TeamScheduleDetailPage';
import TeamScheduleEditPage from '../pages/TeamSchedule/TeamScheduleEditPage';
import WikiHome from '../pages/TabbarPages/arkwiki';
import WikiSearchPage from '../pages/TabbarPages/arkwiki/WikiSearchPage';
import WikiArticlePage from '../pages/TabbarPages/arkwiki/WikiArticlePage';
import LocalCourse from '../pages/TabbarPages/course/pages/what2Reg/pages/LocalCourse';
import Webviewer from '../components/Webviewer';
import Bus from '../pages/Features/Bus';
import CarPark from '../pages/Features/CarPark';
import EatingSchedule from '../pages/Features/EatingSchedule';
import UMOrg from '../pages/Features/UMOrg';
import SettingPage from '../pages/Features/SettingPage';

const ModalAndroidBackButton = ({ navigation, tintColor }) => (
    <ScalePressable
        accessibilityRole="button"
        onPress={() => {
            trigger();
            navigation.goBack();
        }}
        style={[
            styles.androidBackButton,
            { backgroundColor: `${tintColor}14` },
        ]}>
        <Ionicons name="chevron-back" size={22} color={tintColor} />
    </ScalePressable>
);

const ModalIosBackButton = ({ navigation, headerBackProps }) => (
    <HeaderBackButton
        {...headerBackProps}
        onPress={() => {
            trigger();
            navigation.goBack();
        }}
        label=""
    />
);

/**
 * 全站共用的二級頁路由註冊：
 * 供外層 Root Stack（深度鏈接、推播、Quick Actions 與 Android）
 * 及 iOS 各 Tab 內建 Native Stack 共用，避免重複維護路由表。
 */
export const renderSharedStackScreens = (Stack, { theme, t }) => (
    <>
        {/* iPhone 維持 Modal 呈現的二級頁（iPad 與 Android 走 card） */}
        <Stack.Group
            screenOptions={({ navigation }) => ({
                headerTitle: '',
                presentation: Platform.select({
                    android: 'card',
                    ios: Platform.isPad ? 'card' : 'modal',
                }),
                headerLeft:
                    Platform.OS === 'android'
                        ? () => (
                            <ModalAndroidBackButton
                                navigation={navigation}
                                tintColor={theme.black.main}
                            />
                        )
                        : Platform.isPad
                            ? undefined
                            : props => (
                                <ModalIosBackButton
                                    navigation={navigation}
                                    headerBackProps={props}
                                />
                            ),
            })}>
            <Stack.Screen
                name="CarPark"
                component={CarPark}
                options={{ headerTitle: t('車位') }}
            />
            <Stack.Screen
                name="EatingSchedule"
                component={EatingSchedule}
                options={{ headerTitle: t('幹飯時間') }}
            />
            <Stack.Screen
                name="UMOrg"
                component={UMOrg}
                options={{ headerTitle: t('澳大部門') }}
            />
            <Stack.Screen name="NewsDetail" component={NewsDetail} />
            <Stack.Screen name="UMEventDetail" component={UMEventDetail} />
            <Stack.Screen name="AllEvents" component={AllEvents} />
        </Stack.Group>

        {/* 標準左右推入堆疊頁：iOS 一律沿用原生返回鈕（含 Liquid Glass 膠囊） */}
        <Stack.Group
            screenOptions={{
                headerTitle: '',
                presentation: 'card',
            }}>
            <Stack.Screen
                name="Bus"
                component={Bus}
                options={{ headerTitle: t('校園巴士') }}
            />
            {/* 圖片大標題頁：強制 light 讓狀態列圖示在深色封面圖上可見 */}
            <Stack.Screen
                name="ClubDetail"
                component={ClubDetail}
                options={{ statusBarStyle: 'light' }}
            />
            <Stack.Screen name="EventDetail" component={EventDetail} />
            <Stack.Screen
                name="HarborTopicDetail"
                component={HarborTopicDetail}
            />
            <Stack.Screen
                name="HarborCategoryList"
                component={HarborCategoryListPage}
            />
            <Stack.Screen
                name="HarborCategoryTopics"
                component={HarborTopicListPage}
            />
            <Stack.Screen name="HarborTagList" component={HarborTagListPage} />
            <Stack.Screen
                name="HarborTagTopics"
                component={HarborTopicListPage}
            />
            <Stack.Screen name="HarborSearch" component={HarborSearchPage} />
            <Stack.Screen
                name="HarborComposer"
                component={HarborComposerPage}
                options={({ route }) =>
                    route.params?.mode === 'reply'
                        ? {
                            animation: 'fade',
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            gestureEnabled: false,
                            headerShown: false,
                            presentation: 'transparentModal',
                        }
                        : {
                            // 發佈／編輯話題使用一般堆疊頁，避免 iOS Modal 半屏上推
                            presentation: 'card',
                        }
                }
            />
            <Stack.Screen name="HarborDrafts" component={HarborDraftsPage} />
            <Stack.Screen
                name="HarborPendingPosts"
                component={HarborPendingPostsPage}
            />
            <Stack.Screen
                name="HarborPendingPostDetail"
                component={HarborPendingPostDetailPage}
            />
            <Stack.Screen name="LocalCourse" component={LocalCourse} />
            <Stack.Screen name="WikiHome" component={WikiHome} />
            <Stack.Screen name="WikiSearch" component={WikiSearchPage} />
            <Stack.Screen name="WikiArticle" component={WikiArticlePage} />
            <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ headerTitle: t('搜索') }}
            />
            <Stack.Screen name="Webviewer" component={Webviewer} />
            <Stack.Screen
                name="SettingPage"
                component={SettingPage}
                options={{ headerTitle: t('設置') }}
            />
            <Stack.Screen
                name="HarborActivity"
                component={HarborActivityPage}
            />
            <Stack.Screen
                name="HarborRecentReads"
                component={HarborTopicListPage}
            />
            <Stack.Screen name="HarborInbox" component={HarborInboxPage} />
            <Stack.Screen
                name="HarborChatList"
                component={HarborChatListPage}
            />
            <Stack.Screen
                name="HarborChatChannel"
                component={HarborChatChannelPage}
            />
            <Stack.Screen
                name="HarborReviewQueue"
                component={HarborReviewQueuePage}
            />
            <Stack.Screen
                name="HarborReviewDetail"
                component={HarborReviewQueuePage}
            />
            <Stack.Screen name="HarborBadges" component={HarborBadgesPage} />
            <Stack.Screen
                name="HarborAccountSettings"
                component={HarborAccountSettingsPage}
            />
            <Stack.Screen name="HarborProfile" component={HarborProfilePage} />
            <Stack.Screen
                name="TeamScheduleList"
                component={TeamScheduleListPage}
                options={{ headerTitle: t('全部組隊約時間') }}
            />
            <Stack.Screen
                name="TeamScheduleCreate"
                component={TeamScheduleCreatePage}
                options={{ headerTitle: t('建立組隊') }}
            />
            <Stack.Screen
                name="TeamScheduleDetail"
                component={TeamScheduleDetailPage}
                options={{ headerTitle: t('活動詳情') }}
            />
            <Stack.Screen
                name="TeamScheduleEdit"
                component={TeamScheduleEditPage}
                options={{ headerTitle: t('編輯基本資料') }}
            />
        </Stack.Group>
    </>
);

const styles = StyleSheet.create({
    androidBackButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
