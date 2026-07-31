export function getHarborComposerResult(result) {
    const data = result?.data || result || {};
    const post = data?.post || {};
    const action = data?.action;
    const pending = action === 'enqueued' || Boolean(data?.pending_post);
    const topicId = Number(
        post.topicId ??
        post.topic_id ??
        data.topicId ??
        data.topic_id,
    );
    const postNumber = Number(
        post.postNumber ??
        post.post_number ??
        data.postNumber ??
        data.post_number,
    );

    return {
        pending,
        topicId:
            Number.isInteger(topicId) && topicId > 0 ? topicId : null,
        postNumber:
            Number.isInteger(postNumber) && postNumber > 0
                ? postNumber
                : null,
    };
}

export function buildHarborComposerRaw(text, images = []) {
    const imageMarkdown = images
        .map(image => image?.shortUrl)
        .filter(Boolean)
        .map(shortUrl => `![圖片](${shortUrl})`)
        .join('\n\n');

    return [String(text || '').trim(), imageMarkdown]
        .filter(Boolean)
        .join('\n\n');
}
