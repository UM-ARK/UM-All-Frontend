import React, { PureComponent } from 'react';
import { Text, View, RefreshControl, TouchableOpacity, Alert, SectionList, } from 'react-native';

import { uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import { FlatList } from 'react-native';

const COMPONENT_WIDTH = scale(90);
const ITEMS_PER_ROW = 3;
let originClubDataList = [];

const clubFilter = (clubDataList, tag) => clubDataList.filter(a => a.tag === tag);

const chunkIntoRows = (list, size) => {
    const rows = [];
    for (let i = 0; i < list.length; i += size) {
        rows.push(list.slice(i, i + size));
    }
    return rows;
};

class ClubPage extends PureComponent {
    sectionListRef = React.createRef(null);
    static contextType = ThemeContext;

    state = {
        sections: [],
        isLoading: true,
        isOtherViewVisible: true,
    }

    componentDidMount() {
        // 獲取所有社團信息
        this.getData();
    }

    // 請求所有社團的info
    getData = async () => {
        this.handleScrollStart();
        this.setState({ isLoading: true });
        let URL = BASE_URI + GET.CLUB_INFO_ALL;
        try {
            await axios.get(URL).then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubDataList = json.content;
                    clubDataList.forEach(itm => {
                        itm.logo_url = BASE_HOST + itm.logo_url;
                    });
                    originClubDataList = clubDataList;
                    this.setState({
                        sections: this.buildSections(clubDataList),
                        isLoading: false
                    });
                    this.handleScrollEnd();
                } else {
                    Alert.alert('Warning:', message);
                }
            })
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                // 網絡錯誤
                this.setState({ isLoading: false, clubDataList: undefined, });
            } else {
                Alert.alert('組織頁，未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！')
            }
        }
    }

    buildSections = (clubDataList) => {
        if (!clubDataList || clubDataList.length === 0) { return []; }
        const sections = [];
        // 先放 ARK 組織
        const arkList = clubFilter(clubDataList, 'ARK');
        if (arkList.length) {
            sections.push({
                title: 'ARK',
                data: chunkIntoRows(arkList, ITEMS_PER_ROW),
            });
        }

        clubTagList.forEach((tag) => {
            const list = clubFilter(clubDataList, tag);
            if (list.length) {
                sections.push({
                    title: tag,
                    data: chunkIntoRows(list, ITEMS_PER_ROW),
                });
            }
        });

        return sections;
    }

    renderBottomInfo = () => {
        const { theme } = this.context;
        const { themeColor, black, white } = theme;
        return (
            <View style={{ marginBottom: scale(20) }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    {'\n\n\n\n' + '已有 ' +
                        originClubDataList.length +
                        ' 個組織進駐~~\n'}
                </Text>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    {'下拉可刷新頁面~\n'}

                </Text>
                {/* 進駐提示 */}
                <TouchableOpacity
                    onPress={() => openLink(USUAL_Q)}
                    style={{
                        // marginTop: scale(20),
                        alignSelf: 'center',
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontSize: scale(12),
                            marginBottom: 10
                        }}
                    >
                        {'沒有賬號? 進駐ARK ALL!\n'}
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    handleScrollStart = () => {
        this.setState({ isOtherViewVisible: false });
    };

    handleScrollEnd = () => {
        this.setState({ isOtherViewVisible: true });
    };

    render() {
        const { theme } = this.context;
        const { themeColor, black, white } = theme;
        const { sections, isLoading, isOtherViewVisible } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: theme.bg_color, alignItems: 'center', justifyContent: 'center' }}>
                {/* 側邊分類導航 */}
                {sections.length > 0 && isOtherViewVisible && !isLoading ? (
                    <View style={{
                        position: 'absolute',
                        zIndex: 2,
                        right: scale(10),
                        bottom: scale(20),
                        opacity: 0.9,
                        backgroundColor: white,
                        borderRadius: scale(10),
                        ...theme.viewShadow,
                    }}>
                        <FlatList
                            data={sections.map(sec => sec.title)}
                            contentContainerStyle={{
                                paddingHorizontal: scale(3),
                            }}
                            renderItem={(itm) => {
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            trigger();
                                            const sectionIndex = sections.findIndex(sec => sec.title === itm.item);
                                            if (sectionIndex !== -1) {
                                                this.sectionListRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: true });
                                            }
                                        }}
                                        style={{
                                            padding: scale(5),
                                            width: '100%',
                                        }}
                                    >
                                        <Text style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            fontSize: verticalScale(11),
                                            fontWeight: 'bold'
                                        }}>
                                            {clubTagMap(itm.item)}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }}
                            keyExtractor={item => item}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                ) : null}

                {/* 組織展示：使用 SectionList 做虛擬化，避免一次渲染全部卡片 */}
                <SectionList
                    ref={this.sectionListRef}
                    sections={sections}
                    keyExtractor={(item, index) => {
                        const firstId = item[0]?._id;
                        return firstId ? `${firstId}-row-${index}` : `row-${index}`;
                    }}
                    renderSectionHeader={({ section }) => (
                        <View style={{
                            marginLeft: scale(12),
                            marginBottom: scale(5),
                            marginTop: scale(8),
                        }}>
                            <Text style={{
                                ...uiStyle.defaultText,
                                color: theme.black.main,
                                fontSize: verticalScale(15)
                            }}>
                                {clubTagMap(section.title) || section.title}
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            // paddingHorizontal: scale(6),
                        }}>
                            {item.map((club) => (
                                <View key={club._id} style={{ width: COMPONENT_WIDTH + scale(6) }}>
                                    <ClubCard data={club} />
                                </View>
                            ))}
                        </View>
                    )}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                this.getData();
                                this.handleScrollStart();
                            }}
                        />
                    }
                    onScrollBeginDrag={this.handleScrollStart}
                    onMomentumScrollEnd={this.handleScrollEnd}
                    ListEmptyComponent={isLoading ? <Loading /> : null}
                    ListFooterComponent={!isLoading ? this.renderBottomInfo() : null}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={7}
                    removeClippedSubviews
                />
            </View>
        );
    }
}

export default ClubPage;
