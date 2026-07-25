import React from 'react';
import {View} from 'react-native';

import {useTheme} from '../../../components/ThemeContext';

/**
 * 論壇頁 Placeholder（暫留空）
 */
const ForumPage = () => {
    const {theme} = useTheme();
    const {bg_color} = theme;

    return <View style={{flex: 1, backgroundColor: bg_color}} />;
};

export default ForumPage;
