import React, {
    memo,
} from 'react';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import styles from './styles';

const HarborRelatedTopics = memo(({ topics, onPressTopic }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { black, themeColor, themeColorUltraLight, tonal, white } = theme;

    if (!Array.isArray(topics) || topics.length === 0) {
        return <View style={styles.listFooter} />;
    }

    return (
        <View
            style={[
                styles.relatedTopics,
                { backgroundColor: white, borderColor: themeColorUltraLight },
            ]}>
            <Text style={[styles.relatedTitle, { color: black.main }]}>
                {t('相關話題')}
            </Text>
            {topics.map(relatedTopic => (
                <Pressable
                    key={relatedTopic.id}
                    onPress={() => {
                        trigger();
                        onPressTopic(relatedTopic);
                    }}
                    style={({ pressed }) => [
                        styles.relatedTopic,
                        {
                            backgroundColor: pressed
                                ? tonal.primary15
                                : white,
                            borderTopColor: themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        style={[styles.relatedTopicTitle, { color: black.second }]}
                        numberOfLines={2}>
                        {relatedTopic.title}
                    </Text>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={scale(18)}
                        color={themeColor}
                    />
                </Pressable>
            ))}
        </View>
    );
});


export default HarborRelatedTopics;
