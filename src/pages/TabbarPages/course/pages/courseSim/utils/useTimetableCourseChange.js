import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';
import { scheduleOnRN } from 'react-native-worklets';

import { getCourseChanges, isSectionChange } from './courseChangeLayout';

const FRAME_TIMEOUT = 32;
const MAX_HANDOFF_DISTANCE = scale(180);
const SAME_POSITION_TOLERANCE = scale(8);
const SWEEP_REVEAL = 0.46;

function measureCards(canvas, cards, keys, onComplete) {
    const frames = new Map();
    if (!canvas || keys.length === 0) {
        onComplete(frames);
        return undefined;
    }

    let pending = keys.length;
    let done = false;
    const finish = () => {
        if (!done) {
            done = true;
            clearTimeout(timeout);
            onComplete(frames);
        }
    };
    const timeout = setTimeout(finish, FRAME_TIMEOUT);

    const completeCard = key => (left, top, width, height) => {
        if (done) {
            return;
        }
        if (width > 0 && height > 0) {
            frames.set(key, { left, top, width, height });
        }
        pending -= 1;
        if (pending === 0) {
            finish();
        }
    };

    keys.forEach(key => {
        const card = cards.get(key);
        const complete = completeCard(key);
        if (card?.measureLayout) {
            card.measureLayout(canvas, complete, () => complete());
        } else {
            complete();
        }
    });

    return () => {
        done = true;
        clearTimeout(timeout);
    };
}

function getHandoffOffset(from, to) {
    if (!to) {
        return null;
    }
    const x = to.left + to.width / 2 - from.left - from.width / 2;
    const y = to.top + to.height / 2 - from.top - from.height / 2;
    const distance = Math.hypot(x, y);
    return distance > scale(6) && distance <= MAX_HANDOFF_DISTANCE
        ? { x, y, width: from.width, height: from.height }
        : null;
}

function isSameCardPosition(from, to) {
    return Math.abs(from.left - to.left) <= SAME_POSITION_TOLERANCE &&
        Math.abs(from.top - to.top) <= SAME_POSITION_TOLERANCE &&
        Math.abs(from.width - to.width) <= SAME_POSITION_TOLERANCE;
}

export default function useTimetableCourseChange({
    scope,
    view,
    planSlots,
    planCourseCodes,
    conflictSlotKeys,
    reducedMotion,
    startDelay,
}) {
    const [change, setChange] = useState(null);
    const [revealed, setRevealed] = useState(null);
    const progress = useSharedValue(0);
    const canvasRef = useRef(null);
    const cardsRef = useRef(new Map());
    const previous = useRef(null);
    const active = change?.scope === scope && (!change.view || change.view === view) ? change : null;

    useLayoutEffect(() => {
        previous.current = { planSlots, planCourseCodes, conflictSlotKeys, view };
    }, [planSlots, planCourseCodes, conflictSlotKeys, view]);

    const registerCard = useCallback((key, node) => {
        if (node) {
            cardsRef.current.set(key, node);
        } else {
            cardsRef.current.delete(key);
        }
    }, []);

    const cancel = useCallback(() => {
        setChange(null);
        setRevealed(null);
    }, []);
    const play = useCallback((updatePlan, { onComplete } = {}) => {
        const startAt = Date.now() + startDelay;
        const snapshot = previous.current;
        const changes = getCourseChanges(snapshot.planSlots, updatePlan());
        if (changes.arrivals.size === 0 && changes.departures.length === 0) {
            onComplete?.();
            return false;
        }

        setRevealed(null);
        setChange({
            ...changes,
            scope,
            view: snapshot.view,
            snapshot,
            startAt,
            onComplete,
            phase: 'prepare',
        });
        return true;
    }, [scope, startDelay]);

    useLayoutEffect(() => {
        if (change && !active) {
            cancel();
        }
    }, [change, active, cancel]);

    useLayoutEffect(() => {
        if (!view || active?.phase !== 'prepare') {
            return;
        }
        const keys = active.departures.map(([key]) => key);
        return measureCards(canvasRef.current, cardsRef.current, keys, frames => {
            const departingCards = active.departures.flatMap(([key, slot]) => {
                const frame = frames.get(key);
                return frame ? [{ key, slot, frame }] : [];
            });

            progress.set(0);
            setChange(current => current === active ? {
                ...active,
                view,
                departingCards,
                phase: active.handoffs.size > 0 ? 'position' : 'play',
            } : current);
        });
    }, [active, progress, view]);

    useLayoutEffect(() => {
        if (active?.phase !== 'position') {
            return;
        }

        let cancelMeasure;
        const frameRequest = requestAnimationFrame(() => {
            const keys = [...active.handoffs.values()];
            cancelMeasure = measureCards(canvasRef.current, cardsRef.current, keys, frames => {
                const sweeps = new Map(active.sweeps);
                const departingCards = active.departingCards.map(card => {
                    const nextKey = active.handoffs.get(card.key);
                    const nextFrame = frames.get(nextKey);
                    if (nextFrame && isSectionChange(card.slot, active.arrivals.get(nextKey))) {
                        if (isSameCardPosition(card.frame, nextFrame)) {
                            sweeps.set(nextKey, card.slot);
                        } else {
                            sweeps.delete(nextKey);
                        }
                    }
                    return { ...card, handoff: getHandoffOffset(card.frame, nextFrame) };
                });
                setChange(current => current === active ? {
                    ...active,
                    sweeps,
                    departingCards,
                    phase: 'play',
                } : current);
            });
        });

        return () => {
            cancelAnimationFrame(frameRequest);
            cancelMeasure?.();
        };
    }, [active]);

    useLayoutEffect(() => {
        if (active?.phase !== 'play') {
            return;
        }

        const hasSweep = active.sweeps.size > 0;
        const onlySweeps = hasSweep && active.arrivals.size === active.sweeps.size && active.departures.length === active.sweeps.size;
        const duration = reducedMotion ? 120 : onlySweeps ? 180 : active.departures.length > 0 ? 290 : 240;
        const config = { easing: Easing.linear, reduceMotion: ReduceMotion.Never };
        let cancelled = false;

        const reveal = () => {
            if (!cancelled) {
                setRevealed(active);
            }
        };
        const finish = () => {
            if (!cancelled) {
                setChange(null);
                setRevealed(null);
                active.onComplete?.();
            }
        };
        const onFinish = finished => {
            'worklet';
            if (finished) {
                scheduleOnRN(finish);
            }
        };
        const animation = hasSweep ? withSequence(
            ReduceMotion.Never,
            withTiming(SWEEP_REVEAL, { ...config, duration: duration * SWEEP_REVEAL }, finished => {
                if (finished) {
                    scheduleOnRN(reveal);
                }
            }),
            withTiming(1, { ...config, duration: duration * (1 - SWEEP_REVEAL) }, onFinish),
        ) : withTiming(1, { ...config, duration }, onFinish);

        // 卡位量度與延遲共用同一段時間。
        const delay = Math.max(0, active.startAt - Date.now());
        progress.set(delay ? withDelay(delay, animation, ReduceMotion.Never) : animation);
        return () => {
            cancelled = true;
            cancelAnimation(progress);
        };
    }, [active, progress, reducedMotion]);

    // 量度退場卡片時保留舊卡位，取得位置後立即換成新課表。
    const preparing = active?.phase === 'prepare';
    const running = active && !preparing ? active : null;

    return {
        canvasRef,
        registerCard,
        play,
        cancel,
        progress,
        snapshot: preparing ? active.snapshot : null,
        arrivals: running?.arrivals,
        sweeps: running?.sweeps,
        arrivalStart: running?.departures.length ? 0.12 : 0,
        revealNewSection: revealed === running,
        departingCards: running?.departingCards.filter(({ key }) => !running.sweeps.has(running.handoffs.get(key))) ?? [],
        departingSnapshot: running?.snapshot,
    };
}
