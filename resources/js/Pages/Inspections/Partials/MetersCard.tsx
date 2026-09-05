/**
 * Meter readings — Inventorai::meterReadings().
 *
 * Readings arrive on the inspection payload via the `meterReadings` include;
 * writes go one at a time through the app's own routes, which wrap
 * meterReadings()->create/update/delete.
 *
 * Prepaid meters carry a credit balance alongside the reading, so the balance
 * field only appears once "Prepaid" is on.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Droplet, Flame, Gauge, Plus, Save, Trash2, Zap, type LucideIcon } from 'lucide-react';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { useDrafts } from '@/hooks/useDrafts';
import { useUnsavedSource } from '@/hooks/useUnsavedGuard';
import UnsavedBadge from './UnsavedBadge';

const meterTypes = ['gas', 'electricity', 'water', 'other'] as const;

const typeIcon: Record<string, LucideIcon> = {
    gas: Flame,
    electricity: Zap,
    water: Droplet,
    other: Gauge,
};

const typeColor: Record<string, string> = {
    gas: 'text-orange-500',
    electricity: 'text-amber-500',
    water: 'text-blue-500',
    other: 'text-muted-foreground',
};

const blank = () => ({
    meter_type: 'electricity',
    meter_location: '',
    meter_serial: '',
    reading: '',
    reading_unit: '',
    meter_balance: '',
    is_prepaid: false,
    notes: '',
});

const payload = (draft: Record<string, any>) => ({
    ...draft,
    reading: draft.reading === '' ? null : Number(draft.reading),
    meter_balance: draft.meter_balance === '' ? null : Number(draft.meter_balance),
});

/** `captured_at` comes back as an ISO string; only the inspection's own dates are pre-formatted. */
const capturedOn = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MetersCard({
    inspectionId,
    readings,
}: {
    inspectionId: string;
    readings?: Record<string, any>[];
}) {
    const { drafts, setDraft, isDirty, dirtyCount } = useDrafts(readings, (r) => ({
        meter_type: r.meter_type ?? 'other',
        meter_location: r.meter_location ?? '',
        meter_serial: r.meter_serial ?? '',
        reading: r.reading ?? '',
        reading_unit: r.reading_unit ?? '',
        meter_balance: r.meter_balance ?? '',
        is_prepaid: Boolean(r.is_prepaid),
        notes: r.notes ?? '',
    }));

    useUnsavedSource(dirtyCount);

    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const [adding, setAdding] = useState(false);
    const [newReading, setNewReading] = useState(blank);

    const setBusyFor = (id: string, value: boolean) => setBusy((current) => ({ ...current, [id]: value }));

    const save = (id: string) => {
        setBusyFor(id, true);
        router.patch(route('inspections.meters.update', { inspectionId, meterId: id }), payload(drafts[id]), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusyFor(id, false); },
        });
    };

    const remove = (id: string) => {
        setBusyFor(id, true);
        router.delete(route('inspections.meters.destroy', { inspectionId, meterId: id }), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusyFor(id, false); },
        });
    };

    const create = () => {
        setBusyFor('new', true);
        router.post(route('inspections.meters.store', { inspectionId }), payload(newReading), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { setNewReading(blank()); setAdding(false); },
            onFinish: () => { setBusyFor('new', false); },
        });
    };

    const prepaidCount = (readings ?? []).filter((r) => r.is_prepaid).length;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>Meters</CardTitle>
                        <Badge variant="secondary">{readings?.length ?? 0}</Badge>
                        {prepaidCount ? <Badge variant="outline">{prepaidCount} prepaid</Badge> : null}
                        <UnsavedBadge count={dirtyCount} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
                        <Plus className="mr-1.5 h-3 w-3" /> Add reading
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* New reading */}
                {adding && (
                    <div className="rounded-lg border border-dashed p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <InputGroup>
                                <InputGroupAddon className="w-28 shrink-0">Type</InputGroupAddon>
                                <Select
                                    value={newReading.meter_type}
                                    onValueChange={(value) => setNewReading((current) => ({ ...current, meter_type: value }))}
                                >
                                    <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                                    <SelectContent>{meterTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </InputGroup>
                            <InputGroup>
                                <InputGroupAddon className="w-28 shrink-0">Location</InputGroupAddon>
                                <InputGroupInput
                                    value={newReading.meter_location}
                                    onChange={(e) => setNewReading((current) => ({ ...current, meter_location: e.target.value }))}
                                    placeholder="Under the stairs"
                                />
                            </InputGroup>
                            <InputGroup>
                                <InputGroupAddon className="w-28 shrink-0">Serial</InputGroupAddon>
                                <InputGroupInput
                                    value={newReading.meter_serial}
                                    onChange={(e) => setNewReading((current) => ({ ...current, meter_serial: e.target.value }))}
                                    placeholder="Meter serial number"
                                />
                            </InputGroup>
                            <InputGroup>
                                <InputGroupAddon className="w-28 shrink-0">Reading</InputGroupAddon>
                                <InputGroupInput
                                    value={newReading.reading}
                                    onChange={(e) => setNewReading((current) => ({ ...current, reading: e.target.value }))}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                                <InputGroupAddon align="inline-end" className="pr-2">
                                    <Input
                                        value={newReading.reading_unit}
                                        onChange={(e) => setNewReading((current) => ({ ...current, reading_unit: e.target.value }))}
                                        placeholder="kWh"
                                        className="h-7 w-20 text-xs"
                                    />
                                </InputGroupAddon>
                            </InputGroup>
                            <InputGroup className="sm:col-span-2">
                                <InputGroupAddon className="w-28 shrink-0">Notes</InputGroupAddon>
                                <InputGroupInput
                                    value={newReading.notes}
                                    onChange={(e) => setNewReading((current) => ({ ...current, notes: e.target.value }))}
                                    placeholder="Anything worth recording"
                                />
                            </InputGroup>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <Switch
                                    checked={newReading.is_prepaid}
                                    onCheckedChange={(checked) => setNewReading((current) => ({ ...current, is_prepaid: checked }))}
                                />
                                <span>Prepaid</span>
                            </label>
                            <div className="flex items-center gap-2">
                                {newReading.is_prepaid && (
                                    <InputGroup className="w-56">
                                        <InputGroupAddon className="w-20 shrink-0">Balance</InputGroupAddon>
                                        <InputGroupInput
                                            value={newReading.meter_balance}
                                            onChange={(e) => setNewReading((current) => ({ ...current, meter_balance: e.target.value }))}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </InputGroup>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                                <Button size="sm" disabled={busy.new} onClick={create}>
                                    <Save className="mr-1.5 h-3 w-3" /> Add
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing readings */}
                {readings?.map((reading) => {
                    const Icon = typeIcon[reading.meter_type] ?? Gauge;
                    const captured = capturedOn(reading.captured_at);
                    const draft = drafts[reading.id];

                    return (
                        <div key={reading.id} className="rounded-lg border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn('h-4 w-4', typeColor[reading.meter_type] ?? 'text-muted-foreground')} />
                                    <p className="text-sm font-semibold capitalize">{reading.meter_type}</p>
                                    {reading.is_prepaid ? <Badge variant="outline" className="text-[10px]">Prepaid</Badge> : null}
                                    {reading.meter_location ? <span className="text-xs text-muted-foreground">{reading.meter_location}</span> : null}
                                    {captured ? <span className="text-xs text-muted-foreground">· {captured}</span> : null}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {isDirty(reading.id) && <UnsavedBadge />}
                                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={busy[reading.id]} onClick={() => save(reading.id)}>
                                        <Save className="mr-1.5 h-3 w-3" /> Save
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" disabled={busy[reading.id]} onClick={() => remove(reading.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {draft ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <InputGroup>
                                        <InputGroupAddon className="w-28 shrink-0">Type</InputGroupAddon>
                                        <Select
                                            value={draft.meter_type}
                                            onValueChange={(value) => setDraft(reading.id, { meter_type: value })}
                                        >
                                            <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                                            <SelectContent>{meterTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </InputGroup>
                                    <InputGroup>
                                        <InputGroupAddon className="w-28 shrink-0">Location</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.meter_location}
                                            onChange={(e) => setDraft(reading.id, { meter_location: e.target.value })}
                                            placeholder="Not set"
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <InputGroupAddon className="w-28 shrink-0">Serial</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.meter_serial}
                                            onChange={(e) => setDraft(reading.id, { meter_serial: e.target.value })}
                                            placeholder="Not set"
                                        />
                                    </InputGroup>
                                    <InputGroup>
                                        <InputGroupAddon className="w-28 shrink-0">Reading</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.reading}
                                            onChange={(e) => setDraft(reading.id, { reading: e.target.value })}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                        <InputGroupAddon align="inline-end" className="pr-2">
                                            <Input
                                                value={draft.reading_unit}
                                                onChange={(e) => setDraft(reading.id, { reading_unit: e.target.value })}
                                                placeholder="unit"
                                                className="h-7 w-20 text-xs"
                                            />
                                        </InputGroupAddon>
                                    </InputGroup>
                                    <div className="flex items-center gap-3">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                                            <Switch
                                                checked={draft.is_prepaid}
                                                onCheckedChange={(checked) => setDraft(reading.id, { is_prepaid: checked })}
                                            />
                                            <span>Prepaid</span>
                                        </label>
                                        {draft.is_prepaid && (
                                            <InputGroup className="flex-1">
                                                <InputGroupAddon className="w-20 shrink-0">Balance</InputGroupAddon>
                                                <InputGroupInput
                                                    value={draft.meter_balance}
                                                    onChange={(e) => setDraft(reading.id, { meter_balance: e.target.value })}
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                />
                                            </InputGroup>
                                        )}
                                    </div>
                                    <InputGroup>
                                        <InputGroupAddon className="w-28 shrink-0">Notes</InputGroupAddon>
                                        <InputGroupInput
                                            value={draft.notes}
                                            onChange={(e) => setDraft(reading.id, { notes: e.target.value })}
                                            placeholder="Not set"
                                        />
                                    </InputGroup>
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {!readings?.length && !adding && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No meter readings recorded.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
