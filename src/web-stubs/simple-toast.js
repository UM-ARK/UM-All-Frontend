/* eslint-env browser */
// Web 替身：react-native-simple-toast 只有 iOS/Android 原生實現
// 這裡用最簡 DOM 元素模擬底部吐司，接口與原庫保持一致（show / showWithGravity）
const SHORT = 2000;
const LONG = 3500;

let activeToast = null;
let hideTimer = null;

const removeActiveToast = () => {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    if (activeToast && activeToast.parentNode) {
        activeToast.parentNode.removeChild(activeToast);
    }
    activeToast = null;
};

const show = (message, duration = SHORT, gravity = 'bottom') => {
    if (typeof document === 'undefined') {
        return;
    }
    removeActiveToast();

    const element = document.createElement('div');
    element.textContent = String(message ?? '');
    Object.assign(element.style, {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        [gravity === 'top' ? 'top' : 'bottom']: gravity === 'center' ? '50%' : '48px',
        maxWidth: '80vw',
        padding: '10px 18px',
        borderRadius: '20px',
        background: 'rgba(40, 40, 40, 0.92)',
        color: '#fff',
        fontSize: '14px',
        lineHeight: '20px',
        zIndex: '2147483647',
        pointerEvents: 'none',
        transition: 'opacity 200ms ease',
        opacity: '0',
    });
    document.body.appendChild(element);
    activeToast = element;

    // 下一幀再淡入，避免 transition 不生效
    requestAnimationFrame(() => {
        element.style.opacity = '1';
    });

    const visibleMs = typeof duration === 'number' && duration > 100 ? duration : SHORT;
    hideTimer = setTimeout(() => {
        element.style.opacity = '0';
        setTimeout(removeActiveToast, 220);
    }, visibleMs);
};

const Toast = {
    SHORT,
    LONG,
    TOP: 'top',
    BOTTOM: 'bottom',
    CENTER: 'center',
    show,
    showWithGravity: (message, duration, gravity) => show(message, duration, gravity),
    showWithGravityAndOffset: (message, duration, gravity) => show(message, duration, gravity),
};

export default Toast;
