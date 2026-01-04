import { t } from "i18next";
import moment from "moment";

export const getWeekLiteral = (index) => {
    const literals = [
        t('周日', { ns: 'home' }),
        t('周一', { ns: 'home' }),
        t('周二', { ns: 'home' }),
        t('周三', { ns: 'home' }),
        t('周四', { ns: 'home' }),
        t('周五', { ns: 'home' }),
        t('周六', { ns: 'home' }),
    ];
    return literals[index];
};

export const getWeek = (date) => {
    return getWeekLiteral(moment(date).day());
};
