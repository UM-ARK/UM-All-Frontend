export const splitCourseCode = courseCode => {
    const match = String(courseCode || '').match(/^([A-Za-z]+)(\d.*)$/);

    if (!match) {
        return { prefix: '', suffix: courseCode };
    }

    return { prefix: match[1], suffix: match[2] };
};
