/**
 * Alarms & safety equipment — Inventorai::assetChecks().
 *
 * Checks hang off the property's assets rather than off an inspection area,
 * so the API groups them by asset type (smoke alarm, CO alarm, and so on) and
 * carries the asset's make/model/serial through with each check. Only the
 * result fields are writable; the asset itself belongs to the property.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Save, ShieldCheck } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useDrafts } from '@/hooks/useDrafts';
import { useUnsavedSource } from '@/hooks/useUnsavedGuard';
import UnsavedBadge from './UnsavedBadge';

const testedOptions = ['yes', 'no', 'not_accessible'];
const resultOptions = ['pass', 'fail', 'na'];
const conditionOptions = ['good', 'fair', 'poor', 'replace'];

const humanize = (value: string) => value.replace(/_/g, ' ');

const resultVariant = (result: string | null): 'default' | 'destructive' | 'outline' =>
    (result === 'pass' ? 'default' : result === 'fail' ? 'destructive' : 'outline');

const spec = (check: Record<string, any>) => [check.make, check.model, check.serial_number].filter(Boolean).join(' · ');

export default function AssetChecksCard({
    inspectionId,
    groups,
    onOpenPhoto,
}: {
    inspectionId: string;
    groups?: Record<string, any>[];
    onOpenPhoto: (url: string) => void;
}) {
    const checks = (groups ?? []).flatMap((g) => g.checks ?? []);

    const { drafts, setDraft, isDirty, dirtyCount } = useDrafts(checks, (c) => ({
        tested: c.tested ?? '',
        test_result: c.test_result ?? '',
        condition: c.condition ?? '',
        notes: c.notes ?? '',
    }));

    useUnsavedSource(dirtyCount);

    const [busy, setBusy] = useState<Record<string, boolean>>({});

    const save = (id: string) => {
        setBusy((current) => ({ ...current, [id]: true }));
        router.patch(route('inspections.assetChecks.update', { inspectionId, checkId: id }), drafts[id], {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusy((current) => ({ ...current, [id]: false })); },
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <CardTitle>Alarms &amp; Safety</CardTitle>
                    <Badge variant="secondary">{checks.length}</Badge>
                    <UnsavedBadge count={dirtyCount} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {groups?.map((group) => (
                    <div key={group.asset_type}>
                        <div className="mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-semibold capitalize">{group.asset_type_label ?? humanize(group.asset_type ?? '')}</p>
                            <Badge variant="outline" className="text-[10px]">{group.tested_count ?? 0} / {group.total ?? 0} tested</Badge>
                            {group.passed_count ? <Badge variant="outline" className="text-[10px] text-emerald-600">{group.passed_count} passed</Badge> : null}
                        </div>

                        <div className="space-y-2">
                            {group.checks?.map((check: Record<string, any>) => {
                                const draft = drafts[check.id];

                                return (
                                    <div key={check.id} className="rounded-lg border p-3">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            {check.location_description ? (
                                                <span className="flex items-center gap-1 text-sm font-medium">
                                                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />{check.location_description}
                                                </span>
                                            ) : null}
                                            {spec(check) ? <span className="text-xs text-muted-foreground">{spec(check)}</span> : null}
                                            {check.test_result ? <Badge variant={resultVariant(check.test_result)} className="text-[10px] uppercase">{check.test_result}</Badge> : null}
                                            {isDirty(check.id) && <UnsavedBadge className="ml-auto" />}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={isDirty(check.id) ? 'h-7 text-xs' : 'ml-auto h-7 text-xs'}
                                                disabled={busy[check.id]}
                                                onClick={() => save(check.id)}
                                            >
                                                <Save className="mr-1.5 h-3 w-3" /> Save
                                            </Button>
                                        </div>

                                        {draft ? (
                                            <div className="grid gap-2 sm:grid-cols-3">
                                                <InputGroup>
                                                    <InputGroupAddon className="w-24 shrink-0">Tested</InputGroupAddon>
                                                    <Select
                                                        value={draft.tested}
                                                        onValueChange={(value) => setDraft(check.id, { tested: value })}
                                                    >
                                                        <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            {testedOptions.map((o) => <SelectItem key={o} value={o} className="capitalize">{humanize(o)}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </InputGroup>
                                                <InputGroup>
                                                    <InputGroupAddon className="w-24 shrink-0">Result</InputGroupAddon>
                                                    <Select
                                                        value={draft.test_result}
                                                        onValueChange={(value) => setDraft(check.id, { test_result: value })}
                                                    >
                                                        <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            {resultOptions.map((o) => <SelectItem key={o} value={o} className="uppercase">{o}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </InputGroup>
                                                <InputGroup>
                                                    <InputGroupAddon className="w-24 shrink-0">Condition</InputGroupAddon>
                                                    <Select
                                                        value={draft.condition}
                                                        onValueChange={(value) => setDraft(check.id, { condition: value })}
                                                    >
                                                        <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            {conditionOptions.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </InputGroup>
                                                <InputGroup className="sm:col-span-3">
                                                    <InputGroupAddon className="w-24 shrink-0">Notes</InputGroupAddon>
                                                    <InputGroupInput
                                                        value={draft.notes}
                                                        onChange={(e) => setDraft(check.id, { notes: e.target.value })}
                                                        placeholder="Not set"
                                                    />
                                                </InputGroup>
                                            </div>
                                        ) : null}

                                        {check.photos?.length ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {check.photos.map((photo: Record<string, any>) => (
                                                    <img
                                                        key={photo.id}
                                                        src={photo.thumbnail_url ?? photo.url}
                                                        className="h-14 w-14 cursor-pointer rounded-md object-cover transition-opacity hover:opacity-80"
                                                        onClick={() => onOpenPhoto(photo.url)}
                                                    />
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {!checks.length && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No alarm or safety checks on this inspection.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
