export function clubTagMap(tag) {
    switch (tag) {
        case 'SA':
            return '學生會';
            break;
        case 'CLUB':
            return '學會';
            break;
        case 'SOCIETY':
            return '社團';
            break;
        case 'COLLEGE':
            return '書院';
            break;
        case 'OFFICIAL':
            return '澳大官方';
            break;
        case 'MEDIA':
            return '媒體';
            break;
        case 'BUSINESS':
            return '商業';
            break;
        default:
            return '待定';
            break;
    }
}
