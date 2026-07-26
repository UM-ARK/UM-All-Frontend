import {getLocalStorage, setLocalStorage} from '../storageKits';

export const HARBOR_READING_STORAGE_KEY = 'ARK_Harbor_Reading_v1';

let storageQueue = Promise.resolve();

const normalizePositiveInteger = value =>
    Number.isInteger(value) && value > 0 ? value : null;

const sanitizeReadingPositions = value => {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        value instanceof Error
    ) {
        return {};
    }

    return Object.entries(value).reduce((positions, [topicId, postNumber]) => {
        const normalizedTopicId = normalizePositiveInteger(Number(topicId));
        const normalizedPostNumber = normalizePositiveInteger(postNumber);
        if (normalizedTopicId && normalizedPostNumber) {
            positions[normalizedTopicId] = normalizedPostNumber;
        }
        return positions;
    }, {});
};

const readReadingPositions = async () => {
    try {
        const value = await getLocalStorage(HARBOR_READING_STORAGE_KEY);
        return {
            positions: sanitizeReadingPositions(value),
            readable: !(value instanceof Error),
        };
    } catch (_error) {
        return {
            positions: {},
            readable: false,
        };
    }
};

const enqueueStorageTask = task => {
    const result = storageQueue.then(task, task);
    storageQueue = result.catch(() => null);
    return result.catch(() => null);
};

export const getHarborReadingPosition = topicId => {
    const normalizedTopicId = normalizePositiveInteger(topicId);
    if (!normalizedTopicId) {
        return Promise.resolve(null);
    }

    return enqueueStorageTask(async () => {
        const {positions} = await readReadingPositions();
        return normalizePositiveInteger(positions[normalizedTopicId]);
    });
};

export const saveHarborReadingPosition = (topicId, postNumber) => {
    const normalizedTopicId = normalizePositiveInteger(topicId);
    const normalizedPostNumber = normalizePositiveInteger(postNumber);
    if (!normalizedTopicId || !normalizedPostNumber) {
        return Promise.resolve(null);
    }

    return enqueueStorageTask(async () => {
        const {positions, readable} = await readReadingPositions();
        const savedPostNumber = normalizePositiveInteger(
            positions[normalizedTopicId],
        );
        if (
            savedPostNumber &&
            savedPostNumber >= normalizedPostNumber
        ) {
            return savedPostNumber;
        }
        if (!readable) {
            return savedPostNumber;
        }

        const nextPositions = {
            ...positions,
            [normalizedTopicId]: normalizedPostNumber,
        };
        try {
            const result = await setLocalStorage(
                HARBOR_READING_STORAGE_KEY,
                nextPositions,
            );
            return result instanceof Error
                ? savedPostNumber
                : normalizedPostNumber;
        } catch (_error) {
            return savedPostNumber;
        }
    });
};
