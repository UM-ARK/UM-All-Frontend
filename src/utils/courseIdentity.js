/**
 * 課程身份正規化，供純文字匯出與小組課表共享使用。
 */
export function normalizeCourseIdentity(item) {
    const courseCode = String(
        item?.courseCode ?? item?.['Course Code'] ?? '',
    )
        .trim()
        .toUpperCase();
    const sectionRaw = String(item?.section ?? item?.Section ?? '').trim();

    if (
        !/^[A-Z]{4}[0-9]{4}$/.test(courseCode) ||
        !/^[0-9]{1,3}$/.test(sectionRaw)
    ) {
        return null;
    }

    return {
        courseCode,
        section: sectionRaw.padStart(3, '0'),
    };
}

/**
 * 正規化並以 Course Code 與 Section 去重。
 */
export function normalizeCourseIdentities(items) {
    const result = [];
    const seen = new Set();
    const list = Array.isArray(items) ? items : [];

    for (let i = 0; i < list.length; i++) {
        const identity = normalizeCourseIdentity(list[i]);
        if (!identity) {
            continue;
        }
        const key = `${identity.courseCode}\u0000${identity.section}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(identity);
        }
    }

    return result.sort((a, b) => {
        const left = `${a.courseCode}\u0000${a.section}`;
        const right = `${b.courseCode}\u0000${b.section}`;
        return left.localeCompare(right);
    });
}
