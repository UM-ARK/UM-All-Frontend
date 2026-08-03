/**
 * 本人可用時間編輯：草稿、取消／確定、PUT、revision conflict
 */
import {useCallback, useMemo, useRef, useState} from 'react';

import {
    getMyAvailability,
    putMyAvailability,
} from '../../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../../utils/scheduling/schedulingErrors';
import {
    areDraftSelectionsEqual,
    commitAvailabilityDraft,
    createAvailabilityDraftFromServer,
    createEmptyDraft,
} from '../utils/scheduleDraft';

/**
 * @param {object} options
 * @param {string} options.eventId
 * @param {object|null} options.event
 * @param {object|null} options.myAvailability summary 中本人 availability
 * @param {boolean} options.canEdit
 * @param {(availability: object, summaryRevision?: number) => void} options.onSaved
 */
export function useAvailabilityEditor({
    eventId,
    event,
    myAvailability,
    canEdit = false,
    onSaved,
} = {}) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [conflictPrompt, setConflictPrompt] = useState(null);

    const serverSnapshotRef = useRef(null);
    const baselineDraftRef = useRef(null);
    const savingRef = useRef(false);

    const candidateWindows = event?.candidateWindows;
    const slotMinutes = event?.slotMinutes;
    const timezone = event?.timezone;

    const buildDraftFromAvailability = useCallback(
        availability => {
            return createAvailabilityDraftFromServer({
                availability,
                candidateWindows,
                slotMinutes,
                timezone,
                revision:
                    availability && typeof availability.revision === 'number'
                        ? availability.revision
                        : 0,
            });
        },
        [candidateWindows, slotMinutes, timezone],
    );

    const isDirty = useMemo(() => {
        if (!isEditing || !draft || !baselineDraftRef.current) {
            return false;
        }
        return !areDraftSelectionsEqual(draft, baselineDraftRef.current);
    }, [draft, isEditing]);

    const enterEdit = useCallback(() => {
        if (!canEdit || !event) {
            return;
        }
        const next = buildDraftFromAvailability(myAvailability);
        serverSnapshotRef.current = myAvailability ?? null;
        baselineDraftRef.current = next;
        setDraft(next);
        setConflictPrompt(null);
        setIsEditing(true);
    }, [buildDraftFromAvailability, canEdit, event, myAvailability]);

    const discardEdit = useCallback(() => {
        setDraft(null);
        baselineDraftRef.current = null;
        serverSnapshotRef.current = null;
        setConflictPrompt(null);
        setIsEditing(false);
        setIsSaving(false);
        savingRef.current = false;
    }, []);

    const onDraftChange = useCallback(next => {
        setDraft(next);
    }, []);

    /**
     * 確定送出 PUT；失敗回滾畫面至 server snapshot，保留 draft 供重試
     * @returns {Promise<{ok: boolean, code?: string, error?: object}>}
     */
    const confirmEdit = useCallback(async () => {
        if (!eventId || !event || !draft || savingRef.current) {
            return {ok: false};
        }
        savingRef.current = true;
        setIsSaving(true);

        const payload = commitAvailabilityDraft(
            draft,
            event.candidateWindows,
        );
        const snapshot = serverSnapshotRef.current;

        try {
            const response = await putMyAvailability(eventId, payload);
            const availability = response?.availability || {
                ranges: payload.ranges,
                revision:
                    typeof response?.availability?.revision === 'number'
                        ? response.availability.revision
                        : payload.revision + 1,
            };
            const nextRevision = response?.summaryRevision;
            if (typeof onSaved === 'function') {
                onSaved(availability, nextRevision);
            }
            setIsEditing(false);
            setDraft(null);
            baselineDraftRef.current = null;
            serverSnapshotRef.current = null;
            setConflictPrompt(null);
            return {ok: true, availability, summaryRevision: nextRevision};
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);

            // 回滾「樂觀顯示」：呼叫端可依 snapshot；此處保留 draft
            if (typeof onSaved === 'function' && snapshot !== undefined) {
                // 不呼叫 onSaved；呼叫端應維持原 summary，無需額外動作
            }

            if (normalized.code === 'revision_conflict') {
                try {
                    const latest = await getMyAvailability(eventId);
                    const availability = latest?.availability ?? latest;
                    const refreshed = buildDraftFromAvailability(availability);
                    // 不自動覆蓋使用者 draft；提示後讓其決定
                    serverSnapshotRef.current = availability;
                    setConflictPrompt({
                        latestAvailability: availability,
                        latestDraft: refreshed,
                    });
                } catch (_fetchError) {
                    setConflictPrompt({
                        latestAvailability: null,
                        latestDraft: null,
                    });
                }
                return {ok: false, code: 'revision_conflict', error: normalized};
            }

            return {ok: false, code: normalized.code, error: normalized};
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    }, [buildDraftFromAvailability, draft, event, eventId, onSaved]);

    /**
     * revision conflict 後：採用伺服器最新版本作為新 baseline（使用者仍可再改）
     */
    const adoptServerAvailability = useCallback(() => {
        if (!conflictPrompt?.latestDraft) {
            return;
        }
        const next = conflictPrompt.latestDraft;
        baselineDraftRef.current = next;
        serverSnapshotRef.current = conflictPrompt.latestAvailability;
        setDraft(next);
        setConflictPrompt(null);
    }, [conflictPrompt]);

    /**
     * 清除 conflict 提示，繼續用目前 draft（revision 改為最新）
     */
    const keepEditingAfterConflict = useCallback(() => {
        const latest = conflictPrompt?.latestAvailability;
        const latestRevision =
            latest && typeof latest.revision === 'number'
                ? latest.revision
                : draft?.revision;
        if (draft && typeof latestRevision === 'number') {
            const next = {...draft, revision: latestRevision};
            setDraft(next);
            if (latest) {
                serverSnapshotRef.current = latest;
            }
        }
        setConflictPrompt(null);
    }, [conflictPrompt, draft]);

    const emptyDraft = useMemo(
        () =>
            createEmptyDraft({
                mode: 'availability',
                slotMinutes,
                timezone,
            }),
        [slotMinutes, timezone],
    );

    return {
        isEditing,
        draft: draft || emptyDraft,
        isDirty,
        isSaving,
        conflictPrompt,
        enterEdit,
        discardEdit,
        onDraftChange,
        confirmEdit,
        adoptServerAvailability,
        keepEditingAfterConflict,
        clearConflictPrompt: () => setConflictPrompt(null),
    };
}

export default useAvailabilityEditor;
