export function getHarborCategoryKey(category) {
    return String(category.id ?? `slug:${category.slug}`);
}

export function buildHarborCategoryRows(
    categories,
    collapsedCategoryIds = new Set(),
) {
    const categoryKeys = new Set(categories.map(getHarborCategoryKey));
    const childrenByParent = new Map();

    categories.forEach(category => {
        const parentKey =
            category.parentCategoryId == null
                ? null
                : String(category.parentCategoryId);
        const children = childrenByParent.get(parentKey) || [];
        children.push(category);
        childrenByParent.set(parentKey, children);
    });

    const rows = [];
    const visited = new Set();
    const appendCategory = (
        category,
        depth,
        parentLineStates = [],
        isLastSibling = true,
    ) => {
        const categoryKey = getHarborCategoryKey(category);
        if (visited.has(categoryKey)) {
            return;
        }

        visited.add(categoryKey);
        const children = childrenByParent.get(String(category.id)) || [];
        const hasChildren = children.length > 0;
        const isExpanded =
            hasChildren && !collapsedCategoryIds.has(categoryKey);
        rows.push({
            ...category,
            depth,
            parentLineStates,
            isLastSibling,
            hasChildren,
            isExpanded,
        });

        if (!isExpanded) {
            return;
        }
        children.forEach((child, index) => {
            appendCategory(
                child,
                depth + 1,
                [...parentLineStates, !isLastSibling],
                index === children.length - 1,
            );
        });
    };

    const rootCategories = categories.filter(category => {
        if (category.parentCategoryId == null) {
            return true;
        }
        return !categoryKeys.has(String(category.parentCategoryId));
    });
    rootCategories.forEach((category, index) =>
        appendCategory(
            category,
            0,
            [],
            index === rootCategories.length - 1,
        ),
    );
    return rows;
}
