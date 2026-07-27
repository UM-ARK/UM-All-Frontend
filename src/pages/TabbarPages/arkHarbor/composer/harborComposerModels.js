export const COMPOSER_MODES = new Set(['newTopic', 'reply', 'edit']);

export function getEditPost(result) {
    return result?.post || result?.data?.post || result?.data || result || {};
}
