/**
 * Keys and fobs — Inventorai::keysFobs().
 *
 * A typed count of what was handed over. `quantity` is what matters at
 * check-in/check-out time, so the total across every row is shown up front.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Plus, Save, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useDrafts } from '@/hooks/useDrafts';
import { useUnsavedSource } from '@/hooks/useUnsavedGuard';
import UnsavedBadge from './UnsavedBadge';

const itemTypes = [
    'front_door_key', 'back_door_key', 'mailbox_key', 'window_key',
    'entry_fob', 'garage_remote', 'gate_remote', 'other',
] as const;

const humanize = (value: string) => value.replace(/_/g, ' ');

/** The quantity input hands back a string, so the field is widened before `payload` coerces it. */
const blank = () => ({ item_type: 'front_door_key', description: '', quantity: 1 as number | string, notes: '' });

const payload = (draft: Record<string, any>) => ({ ...draft, quantity: Number(draft.quantity) || 1 });

export default function KeysCard({
    inspectionId,
    keys,
}: {
    inspectionId: string;
    keys?: Record<string, any>[];
}) {
    const { drafts, setDraft, isDirty, dirtyCount } = useDrafts(keys, (k) => ({
        item_type: k.item_type ?? 'other',
        description: k.description ?? '',
        quantity: k.quantity ?? 1,
        notes: k.notes ?? '',
    }));

    useUnsavedSource(dirtyCount);

    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const [adding, setAdding] = useState(false);
    const [newKey, setNewKey] = useState(blank);

    const setBusyFor = (id: string, value: boolean) => setBusy((current) => ({ ...current, [id]: value }));

    const save = (id: string) => {
        setBusyFor(id, true);
        router.patch(route('inspections.keys.update', { inspectionId, keyId: id }), payload(drafts[id]), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusyFor(id, false); },
        });
    };

    const remove = (id: string) => {
        setBusyFor(id, true);
        router.delete(route('inspections.keys.destroy', { inspectionId, keyId: id }), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusyFor(id, false); },
        });
    };

    const create = () => {
        setBusyFor('new', true);
        router.post(route('inspections.keys.store', { inspectionId }), payload(newKey), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { setNewKey(blank()); setAdding(false); },
            onFinish: () => { setBusyFor('new', false); },
        });
    };

    const total = (keys ?? []).reduce((sum, k) => sum + (Number(k.quantity) || 0), 0);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>Keys &amp; Fobs</CardTitle>
                        <Badge variant="secondary">{total} item{total === 1 ? '' : 's'}</Badge>
                        <UnsavedBadge count={dirtyCount} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
                        <Plus className="mr-1.5 h-3 w-3" /> Add key
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* New key */}
                {adding && (
                    <div className="rounded-lg border border-dashed p-3">
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                            <InputGroup>
                                <InputGroupAddon className="w-24 shrink-0">Type</InputGroupAddon>
                                <Select
                                    value={newKey.item_type}
                                    onValueChange={(value) => setNewKey((current) => ({ ...current, item_type: value }))}
                                >
                                    <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {itemTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{humanize(t)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </InputGroup>
                            <InputGroup>
                                <InputGroupAddon className="w-24 shrink-0">Description</InputGroupAddon>
                                <InputGroupInput
                                    value={newKey.description}
                                    onChange={(e) => setNewKey((current) => ({ ...current, description: e.target.value }))}
                                    placeholder="Yale, brass"
                                />
                            </InputGroup>
                            <InputGroup>
                                <InputGroupAddon className="w-12 shrink-0">Qty</InputGroupAddon>
                                <InputGroupInput
                                    value={newKey.quantity}
                                    onChange={(e) => setNewKey((current) => ({ ...current, quantity: e.target.value }))}
                                    type="number"
                                    min="1"
                                />
                            </InputGroup>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <InputGroup className="flex-1">
                                <InputGroupAddon className="w-24 shrink-0">Notes</InputGroupAddon>
                                <InputGroupInput
                                    value={newKey.notes}
                                    onChange={(e) => setNewKey((current) => ({ ...current, notes: e.target.value }))}
                                    placeholder="Anything worth recording"
                                />
                            </InputGroup>
                            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                            <Button size="sm" disabled={busy.new} onClick={create}>
                                <Save className="mr-1.5 h-3 w-3" /> Add
                            </Button>
                        </div>
                    </div>
                )}

                {/* Existing keys */}
                {keys?.map((key) => {
                    const draft = drafts[key.id];

                    return (
                        <div key={key.id} className="rounded-lg border p-3">
                            {draft ? (
                                <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto]">
                                    <InputGroup>
                                        <InputGroupAddon className="w-24 shrink-0"><KeyRound className="h-3.5 w-3.5" /></InputGroupAddon>
                                        <Select
                                            value={draft.item_type}
                                            onValueChange={(value) => setDraft(key.id, { item_type: value })}
                                        >
                                            <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {itemTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{humanize(t)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </InputGroup>
                                    <InputGroup>
                                        <InputGroupAddon className="w-24 shrink-0">Description</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.description}
                                            onChange={(e) => setDraft(key.id, { description: e.target.value })}
                                            placeholder="Not set"
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <InputGroupAddon className="w-12 shrink-0">Qty</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.quantity}
                                            onChange={(e) => setDraft(key.id, { quantity: e.target.value })}
                                            type="number"
                                            min="1"
                                        />
                                    </InputGroup>
                                    <div className="flex items-center gap-1.5">
                                        {isDirty(key.id) && <UnsavedBadge />}
                                        <Button variant="outline" size="sm" className="h-9 text-xs" disabled={busy[key.id]} onClick={() => save(key.id)}>
                                            <Save className="mr-1.5 h-3 w-3" /> Save
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive hover:text-destructive" disabled={busy[key.id]} onClick={() => remove(key.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <InputGroup className="lg:col-span-4">
                                        <InputGroupAddon className="w-24 shrink-0">Notes</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.notes}
                                            onChange={(e) => setDraft(key.id, { notes: e.target.value })}
                                            placeholder="Not set"
                                        />
                                    </InputGroup>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {!keys?.length && !adding && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No keys or fobs recorded.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
