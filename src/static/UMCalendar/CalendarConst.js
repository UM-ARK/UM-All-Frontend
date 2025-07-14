import { t } from "i18next";
import moment from "moment";

export const WeekLiterals = [
    t('周日', { ns: 'home' }),
    t('周一', { ns: 'home' }),
    t('周二', { ns: 'home' }),
    t('周三', { ns: 'home' }),
    t('周四', { ns: 'home' }),
    t('周五', { ns: 'home' }),
    t('周六', { ns: 'home' }),
];

export const getWeek = (date) => {
    return WeekLiterals[moment(date).day()];
};
