const DEFAULT_NAMESPACE_LIMIT = 20;

const namespaceCaches = new Map();
const namespaceLimits = new Map();
const inFlightRequests = new Map();
let cacheGeneration = 0;

function stableSerialize(value) {
    if (Array.isArray(value)) {
        return `[${value.map(item => stableSerialize(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function normalizeKey(key) {
    if (!Array.isArray(key) || key.length === 0) {
        throw new TypeError('Harbor query cache key 必須是非空陣列');
    }
    return key;
}

function getNamespace(key, namespace) {
    return namespace || String(key[0]);
}

function getCache(namespace) {
    let cache = namespaceCaches.get(namespace);
    if (!cache) {
        cache = new Map();
        namespaceCaches.set(namespace, cache);
    }
    return cache;
}

function isKeyPrefix(key, prefix) {
    return (
        prefix.length <= key.length &&
        prefix.every((item, index) =>
            stableSerialize(item) === stableSerialize(key[index]),
        )
    );
}

function touchEntry(cache, serializedKey, entry) {
    cache.delete(serializedKey);
    cache.set(serializedKey, entry);
}

function trimNamespace(namespace) {
    const cache = namespaceCaches.get(namespace);
    const limit = namespaceLimits.get(namespace) || DEFAULT_NAMESPACE_LIMIT;
    while (cache?.size > limit) {
        cache.delete(cache.keys().next().value);
    }
}

export function readHarborQueryCache(key, options = {}) {
    const normalizedKey = normalizeKey(key);
    const namespace = getNamespace(normalizedKey, options.namespace);
    const cache = namespaceCaches.get(namespace);
    const serializedKey = stableSerialize(normalizedKey);
    const entry = cache?.get(serializedKey);
    if (!entry) {
        return undefined;
    }
    const maxAgeMs = options.maxAgeMs ?? Infinity;
    if (Date.now() - entry.updatedAt > maxAgeMs) {
        cache.delete(serializedKey);
        return undefined;
    }
    touchEntry(cache, serializedKey, entry);
    return entry.value;
}

export function writeHarborQueryCache(key, value, options = {}) {
    const normalizedKey = normalizeKey(key);
    const namespace = getNamespace(normalizedKey, options.namespace);
    const cache = getCache(namespace);
    const serializedKey = stableSerialize(normalizedKey);
    cache.delete(serializedKey);
    cache.set(serializedKey, {
        key: [...normalizedKey],
        updatedAt: Date.now(),
        value,
    });
    trimNamespace(namespace);
    return value;
}

export function fetchHarborQueryCache(key, fetcher, options = {}) {
    const normalizedKey = normalizeKey(key);
    const namespace = getNamespace(normalizedKey, options.namespace);
    const requestKey = `${stableSerialize(namespace)}:${stableSerialize(normalizedKey)}`;
    const existingRequest = inFlightRequests.get(requestKey);
    if (existingRequest) {
        return existingRequest.promise;
    }
    const cache = namespaceCaches.get(namespace);
    const serializedKey = stableSerialize(normalizedKey);
    const entry = cache?.get(serializedKey);
    const age = entry ? Date.now() - entry.updatedAt : Infinity;
    const freshMs = options.freshMs ?? 0;
    const staleMs = options.staleMs ?? Infinity;
    if (!options.force && entry && age <= freshMs) {
        touchEntry(cache, serializedKey, entry);
        return Promise.resolve(entry.value);
    }
    if (entry && age > staleMs) {
        cache.delete(serializedKey);
    }
    const generation = cacheGeneration;
    const controller = new AbortController();
    const request = {controller, promise: null};
    request.promise = Promise.resolve()
        .then(() => fetcher({signal: controller.signal}))
        .then(value => {
            if (generation === cacheGeneration && !controller.signal.aborted) {
                writeHarborQueryCache(normalizedKey, value, {namespace});
            }
            return value;
        })
        .finally(() => {
            if (inFlightRequests.get(requestKey) === request) {
                inFlightRequests.delete(requestKey);
            }
        });
    inFlightRequests.set(requestKey, request);
    return request.promise;
}

export function invalidateHarborQueryCache(key, options = {}) {
    const normalizedKey = normalizeKey(key);
    const namespace = getNamespace(normalizedKey, options.namespace);
    const cache = namespaceCaches.get(namespace);
    if (!cache) {
        return;
    }
    if (!options.prefix) {
        cache.delete(stableSerialize(normalizedKey));
        return;
    }
    for (const [serializedKey, entry] of [...cache]) {
        if (isKeyPrefix(entry.key, normalizedKey)) {
            cache.delete(serializedKey);
        }
    }
}

export function patchHarborQueryCache(key, updater, options = {}) {
    const normalizedKey = normalizeKey(key);
    const namespace = getNamespace(normalizedKey, options.namespace);
    const cache = namespaceCaches.get(namespace);
    const serializedKey = stableSerialize(normalizedKey);
    const entry = cache?.get(serializedKey);
    if (!entry) {
        return undefined;
    }
    if (options.preserveUpdatedAt) {
        entry.value = updater(entry.value);
        touchEntry(cache, serializedKey, entry);
        return entry.value;
    }
    return writeHarborQueryCache(normalizedKey, updater(entry.value), {namespace});
}

export function patchHarborQueryCachePrefix(prefix, updater, options = {}) {
    const normalizedPrefix = normalizeKey(prefix);
    const namespace = getNamespace(normalizedPrefix, options.namespace);
    const cache = namespaceCaches.get(namespace);
    let patchedCount = 0;
    if (!cache) {
        return patchedCount;
    }
    for (const [serializedKey, entry] of [...cache]) {
        if (!isKeyPrefix(entry.key, normalizedPrefix)) {
            continue;
        }
        const value = updater(entry.value, entry.key);
        if (options.preserveUpdatedAt) {
            entry.value = value;
            touchEntry(cache, serializedKey, entry);
        } else {
            writeHarborQueryCache(entry.key, value, {namespace});
        }
        patchedCount += 1;
    }
    return patchedCount;
}

export function setHarborQueryNamespaceLimit(namespace, limit) {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new TypeError('Harbor query cache namespace limit 必須是正整數');
    }
    namespaceLimits.set(namespace, limit);
    trimNamespace(namespace);
}

export function resetHarborQueryCache() {
    cacheGeneration += 1;
    inFlightRequests.forEach(request => request.controller.abort());
    inFlightRequests.clear();
    namespaceCaches.clear();
}
