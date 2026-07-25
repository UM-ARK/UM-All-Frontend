import React from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-screens/experimental';

import {useTheme} from '../../../components/ThemeContext';

/**
 * 論壇頁 Placeholder（底部 Tab；內容待原生 Harbor 首頁補齊）
 */
const ForumPage = () => {
    const {theme} = useTheme();
    const {bg_color} = theme;

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: bg_color}} edges={{top: true}}>
            <View style={{flex: 1, backgroundColor: bg_color}} />
        </SafeAreaView>
    );
};

export default ForumPage;
