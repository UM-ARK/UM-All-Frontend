export const navigateToWikiSearch = (navigation, query, options = {}) => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    navigation.navigate('WikiSearch', {
        query: normalizedQuery,
        autoOpenUnique: Boolean(options.autoOpenUnique),
    });
};
