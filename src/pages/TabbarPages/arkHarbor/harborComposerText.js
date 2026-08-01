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
        .map(image => {
            if (typeof image?.markdown === 'string' && image.markdown.trim()) {
                return image.markdown.trim();
            }
            return image?.shortUrl
                ? `![圖片](${image.shortUrl})`
                : '';
        })
        .filter(Boolean)
        .join('\n\n');

    return [String(text || '').trim(), imageMarkdown]
        .filter(Boolean)
        .join('\n\n');
}

const HARBOR_UPLOAD_IMAGE_LINE_PATTERN =
    /^\s*(!\[[^\]\n]*\]\(\s*(upload:\/\/[^)\s]+)(?:\s+["'][^)]*["'])?\s*\))\s*$/i;

export function splitHarborComposerRaw(
    raw,
    {existingImages = [], previewUrls = []} = {},
) {
    const imagesByShortUrl = new Map(
        existingImages
            .filter(image => image?.shortUrl)
            .map(image => [image.shortUrl, image]),
    );
    const images = [];
    const textLines = String(raw || '').split('\n').filter(line => {
        const match = line.match(HARBOR_UPLOAD_IMAGE_LINE_PATTERN);
        if (!match) {
            return true;
        }
        const markdown = match[1];
        const shortUrl = match[2];
        const existingImage = imagesByShortUrl.get(shortUrl);
        const remoteUrl =
            existingImage?.remoteUrl ||
            existingImage?.localUri ||
            previewUrls[images.length] ||
            '';
        images.push({
            ...(existingImage || {}),
            id:
                existingImage?.id ||
                `edit-image-${images.length}-${shortUrl}`,
            localUri: existingImage?.localUri || remoteUrl,
            remoteUrl,
            shortUrl,
            markdown,
            progress: 1,
            status: 'uploaded',
        });
        return false;
    });

    return {
        text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        images,
    };
}
