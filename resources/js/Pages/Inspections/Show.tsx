/**
 * Inspection editor.
 *
 * Everything on this page arrives in the single GET /inspections/{id} call
 * made by InspectionController@show — areas, items, meters, keys, compliance
 * and asset checks all come from that one payload's `include`. Writes are the
 * opposite: each record type goes back through its own SDK resource, one
 * record at a time.
 */
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import AreaPanel from './Partials/AreaPanel';
import AssetChecksCard from './Partials/AssetChecksCard';
import ComplianceCard from './Partials/ComplianceCard';
import KeysCard from './Partials/KeysCard';
import MetersCard from './Partials/MetersCard';
import UnsavedBadge from './Partials/UnsavedBadge';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { getEcho } from '@/lib/echo';
import { UnsavedGuard } from '@/hooks/useUnsavedGuard';

const humanize = (value: string) => value.replace(/_/g, ' ');

export default function Show({ inspection }: { inspection: Record<string, any> }) {
    const areas: Record<string, any>[] = inspection.areas ?? [];

    // --- Accordion state -------------------------------------------------------
    // Areas, items and compliance forms are each an independent multi-accordion.
    // The "Expand all" switch drives all three at once: on if everything that can
    // be open is open, and flipping it sets or clears every panel.
    const areaIds: string[] = areas.map((a) => String(a.id));
    const itemIds: string[] = areas.flatMap((a) => (a.items ?? []).map((i: Record<string, any>) => String(i.id)));
    const formIds: string[] = (inspection.compliance_forms ?? []).map((f: Record<string, any>) => String(f.form_id));

    // A long inspection opens on its first area only; compliance forms are few
    // and the whole point of them is the outstanding count, so they start open.
    const [openAreas, setOpenAreas] = useState<string[]>(() => areaIds.slice(0, 1));
    const [openItems, setOpenItems] = useState<string[]>([]);
    const [openForms, setOpenForms] = useState<string[]>(() => [...formIds]);

    // Vue expressed this as a get/set computed; in React the getter is a derived
    // value and the setter is the switch's own handler.
    const total = areaIds.length + itemIds.length + formIds.length;
    const openCount = openAreas.length + openItems.length + openForms.length;
    const expandAll = total > 0 && openCount === total;

    const setExpandAll = (value: boolean) => {
        setOpenAreas(value ? [...areaIds] : []);
        setOpenItems(value ? [...itemIds] : []);
        setOpenForms(value ? [...formIds] : []);
    };

    // --- Lightbox --------------------------------------------------------------
    // Every photo on the page in one flat list so prev/next walks the lot.
    const allPhotos: string[] = (() => {
        const photos: string[] = [];
        areas.forEach((area) => {
            (area.photos ?? []).forEach((p: Record<string, any>) => photos.push(p.original_url ?? p.url));
            (area.items ?? []).forEach((item: Record<string, any>) => {
                (item.photos ?? []).forEach((p: Record<string, any>) => photos.push(p.original_url ?? p.url));
            });
        });
        (inspection.asset_checks ?? []).forEach((group: Record<string, any>) => {
            (group.checks ?? []).forEach((check: Record<string, any>) => {
                (check.photos ?? []).forEach((p: Record<string, any>) => photos.push(p.url));
            });
        });
        return photos;
    })();

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const lightboxSrc = allPhotos[lightboxIndex] ?? '';

    const openLightbox = (url: string) => {
        const index = allPhotos.indexOf(url);
        setLightboxIndex(index >= 0 ? index : 0);
        setLightboxOpen(true);
    };

    const lightboxPrev = () => { setLightboxIndex((index) => (index > 0 ? index - 1 : index)); };
    const lightboxNext = () => { setLightboxIndex((index) => (index < allPhotos.length - 1 ? index + 1 : index)); };
    const onLightboxKeydown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') lightboxPrev();
        else if (e.key === 'ArrowRight') lightboxNext();
    };

    // --- Areas and items -------------------------------------------------------
    // Saves keep the page's own state (open panels, drafts elsewhere) rather than
    // remounting, so a save in one panel doesn't collapse the rest of the page.
    const visitOptions = { preserveScroll: true, preserveState: true } as const;

    // Vue built a `useForm` per area and per item right here, in a loop over the
    // payload. React's useForm is a hook and cannot run in a loop, so an area is
    // a component that owns its own form and its items own theirs; each level
    // reports its unsaved count upward and the page adds them together.
    const [areaCounts, setAreaCounts] = useState<Record<string, number>>({});

    // Stable identity: the areas fire this from an effect, so a new function on
    // every render would loop.
    const onAreaDirtyChange = useCallback((areaId: string, count: number) => {
        setAreaCounts((current) => (current[areaId] === count ? current : { ...current, [areaId]: count }));
    }, []);

    const unsavedTotal = Object.values(areaCounts).reduce((sum, count) => sum + count, 0);

    // --- Photo uploads ---------------------------------------------------------
    const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});

    const uploadPhoto = (routeName: string, params: Record<string, string>, key: string, file: File) => {
        setUploadingPhotos((current) => ({ ...current, [key]: true }));
        router.post(route(routeName, params), { file } as any, {
            ...visitOptions,
            forceFormData: true,
            onFinish: () => { setUploadingPhotos((current) => ({ ...current, [key]: false })); },
        });
    };

    const uploadAreaPhoto = (areaId: string, file: File) =>
        uploadPhoto('inspections.areas.uploadPhoto', { inspectionId: inspection.id, areaId }, areaId, file);

    const uploadItemPhoto = (itemId: string, file: File) =>
        uploadPhoto('inspections.items.uploadPhoto', { inspectionId: inspection.id, itemId }, itemId, file);

    // --- Real-time updates -----------------------------------------------------
    // Vue subscribed in onMounted and left the channel in onUnmounted; in React
    // both halves live in one effect so the channel goes with the page.
    const channelName = `inspection.${inspection.id}`;
    useEffect(() => {
        const echo = getEcho();
        echo?.private(channelName).listen('.inspection-photo-uploaded', () => router.reload());

        return () => {
            echo?.leave(channelName);
        };
    }, [channelName]);

    // --- Summary ---------------------------------------------------------------
    const req = inspection.completion_requirements ?? {};
    const requirements = [
        { label: 'Ratings', required: req.require_ratings },
        { label: 'Photos', required: req.require_photos },
        { label: 'Meters', required: req.require_meters },
        { label: 'Keys', required: req.require_keys },
        { label: 'Compliance', required: req.require_compliance },
    ].filter((r) => r.required);

    return (
        // Markers only help while you are looking at the page; the guard covers
        // leaving it. The cards register their own counts (see useUnsavedGuard).
        <UnsavedGuard own={unsavedTotal}>
            <Head title={`Edit — ${humanize(inspection.type ?? 'Inspection')}`} />

            {/* Photo lightbox */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="!w-auto !max-w-[90vw] overflow-hidden !p-0" onKeyDown={onLightboxKeydown}>
                    <img src={lightboxSrc} className="max-h-[85vh] max-w-[90vw] object-contain" />
                    {lightboxIndex > 0 && (
                        <button
                            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                            onClick={lightboxPrev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}
                    {lightboxIndex < allPhotos.length - 1 && (
                        <button
                            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                            onClick={lightboxNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                        {lightboxIndex + 1} / {allPhotos.length}
                    </div>
                </DialogContent>
            </Dialog>

            <AuthenticatedLayout
                header={
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={route('inspections.index')}><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div className="flex-1">
                            <h2 className="text-xl leading-tight font-semibold text-foreground capitalize">{humanize(inspection.type ?? 'Inspection')}</h2>
                            {inspection.property?.address && <p className="text-sm text-muted-foreground">{inspection.property.address.full_address}</p>}
                        </div>
                        <Badge variant={inspection.status === 'completed' ? 'default' : 'secondary'} className="text-sm capitalize">{humanize(inspection.status ?? '—')}</Badge>
                    </div>
                }
            >
                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                        {/* Summary */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-6 sm:flex-row">
                                    {inspection.property?.image ? (
                                        <img
                                            src={inspection.property.image}
                                            className="h-32 w-48 shrink-0 cursor-pointer rounded-lg object-cover"
                                            onClick={() => openLightbox(inspection.property.image)}
                                        />
                                    ) : (
                                        <div className="flex h-32 w-48 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>
                                    )}
                                    <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                                        <div><p className="text-muted-foreground">Date</p><p className="font-medium">{inspection.scheduled_at ?? '—'}</p></div>
                                        <div><p className="text-muted-foreground">Inspector</p><p className="font-medium">{inspection.inspector?.name ?? '—'}</p></div>
                                        <div><p className="text-muted-foreground">Type</p><p className="font-medium capitalize">{humanize(inspection.type ?? '—')}</p></div>
                                        <div><p className="text-muted-foreground">Depth</p><p className="font-medium capitalize">{humanize(inspection.inspection_depth ?? '—')}</p></div>
                                        <div>
                                            <p className="text-muted-foreground">Defects</p>
                                            <p className="font-medium">
                                                {inspection.statistics?.total_defects ?? 0}{' '}
                                                {inspection.statistics?.critical_defects ? <span className="text-red-500">({inspection.statistics.critical_defects} critical)</span> : null}
                                            </p>
                                        </div>
                                        <div><p className="text-muted-foreground">Photos</p><p className="font-medium">{inspection.statistics?.total_photos ?? 0}</p></div>
                                        <div><p className="text-muted-foreground">Areas</p><p className="font-medium">{areas.length}</p></div>
                                        <div>
                                            <p className="text-muted-foreground">Property</p>
                                            <p className="flex items-center gap-1 font-medium"><MapPin className="h-3 w-3 shrink-0" />{inspection.property?.address?.line_1 ?? '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* What this inspection type has to have before it can be completed */}
                                {requirements.length > 0 && (
                                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
                                        <span className="text-xs text-muted-foreground">Required to complete:</span>
                                        {requirements.map((requirement) => (
                                            <Badge key={requirement.label} variant="outline" className="text-[10px]">
                                                {requirement.label}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Areas and items */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-semibold">Areas &amp; Items</h3>
                                        <Badge variant="secondary">{areas.length} area{areas.length === 1 ? '' : 's'}</Badge>
                                        <Badge variant="outline">{itemIds.length} item{itemIds.length === 1 ? '' : 's'}</Badge>
                                        <UnsavedBadge count={unsavedTotal} />
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Switch checked={expandAll} onCheckedChange={setExpandAll} />
                                        <span className="text-muted-foreground">Expand all</span>
                                    </label>
                                </div>

                                {areas.length ? (
                                    <Accordion type="multiple" value={openAreas} onValueChange={setOpenAreas} className="rounded-lg border">
                                        {areas.map((area) => (
                                            <AreaPanel
                                                key={area.id}
                                                area={area}
                                                inspectionId={String(inspection.id)}
                                                openItems={openItems}
                                                onOpenItemsChange={setOpenItems}
                                                uploadingPhotos={uploadingPhotos}
                                                onUploadAreaPhoto={uploadAreaPhoto}
                                                onUploadItemPhoto={uploadItemPhoto}
                                                onOpenPhoto={openLightbox}
                                                onDirtyChange={onAreaDirtyChange}
                                            />
                                        ))}
                                    </Accordion>
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">This inspection has no areas to edit.</p>
                                )}
                            </CardContent>
                        </Card>

                        <MetersCard inspectionId={String(inspection.id)} readings={inspection.meter_readings} />

                        <KeysCard inspectionId={String(inspection.id)} keys={inspection.keys_fobs} />

                        <ComplianceCard
                            open={openForms}
                            onOpenChange={setOpenForms}
                            inspectionId={String(inspection.id)}
                            forms={inspection.compliance_forms}
                        />

                        <AssetChecksCard
                            inspectionId={String(inspection.id)}
                            groups={inspection.asset_checks}
                            onOpenPhoto={openLightbox}
                        />
                    </div>
                </div>
            </AuthenticatedLayout>
        </UnsavedGuard>
    );
}
