import { useCallback, useMemo, useState } from 'react';

type Record_ = Record<string, any>;

function rebuild<T extends Record_>(
    source: Record_[] | undefined,
    build: (record: Record_) => T,
) {
    const drafts: Record<string, T> = {};
    (source ?? []).forEach((record) => {
        drafts[record.id] = build(record);
    });

    return {
        drafts,
        saved: Object.fromEntries(
            Object.entries(drafts).map(([id, draft]) => [id, JSON.stringify(draft)]),
        ) as Record<string, string>,
    };
}

/**
 * Editable copies of a list of API records.
 *
 * Every record type on the inspection page is edited in place and saved on
 * demand, one record at a time. Drafts are rebuilt from the payload whenever
 * the server sends new records, so a save always leaves the row showing what
 * the API actually stored; alongside them sits a snapshot of that server
 * state, which is what lets a row report unsaved edits.
 *
 * Unlike the Vue original, drafts are immutable state rather than a mutable
 * ref, so edits go through `setDraft` instead of assigning to the draft.
 *
 * @param source  the records as they arrive from the API
 * @param build   the editable shape for one record
 */
export function useDrafts<T extends Record_>(
    source: Record_[] | undefined,
    build: (record: Record_) => T,
) {
    // Vue rebuilt these in a `watch(..., { immediate: true })`, which runs
    // before the first render. An effect would run *after* it and flash a row
    // of empty fields, so the payload is compared during render instead and
    // the drafts are rebuilt in the same pass that saw the new records.
    const sourceKey = JSON.stringify(source ?? []);
    const [state, setState] = useState(() => rebuild(source, build));
    const [builtFrom, setBuiltFrom] = useState(sourceKey);

    if (builtFrom !== sourceKey) {
        setBuiltFrom(sourceKey);
        setState(rebuild(source, build));
    }

    const setDraft = useCallback((id: string, patch: Partial<T>) => {
        setState((current) => ({
            ...current,
            drafts: { ...current.drafts, [id]: { ...current.drafts[id], ...patch } },
        }));
    }, []);

    const isDirty = useCallback(
        (id: string) =>
            id in state.drafts && JSON.stringify(state.drafts[id]) !== state.saved[id],
        [state],
    );

    const dirtyCount = useMemo(
        () => Object.keys(state.drafts).filter(isDirty).length,
        [state, isDirty],
    );

    return { drafts: state.drafts, setDraft, isDirty, dirtyCount };
}
