/**
 * One area of the inspection: its own Inertia form, plus its items.
 *
 * The Vue page built a `useForm` per area inside `Object.fromEntries(...)`.
 * React's useForm is a hook, so the loop moved out here: one component per
 * area, one form each. The area also collects what its items are holding —
 * a closed item panel still has to show up on the area's own trigger — and
 * reports the total to the page.
 */
import { useCallback, useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ItemPanel from './ItemPanel';
import PhotoGrid from './PhotoGrid';
import PhraseInput from './PhraseInput';
import UnsavedBadge from './UnsavedBadge';
import { useForm } from '@inertiajs/react';
import { Images, Save } from 'lucide-react';

const conditionOptions = ['poor', 'fair', 'good', 'excellent'];
const cleanlinessOptions = ['dirty', 'fair', 'clean', 'spotless'];

// Saves keep the page's own state (open panels, drafts elsewhere) rather than
// remounting, so a save in one panel doesn't collapse the rest of the page.
const visitOptions = { preserveScroll: true, preserveState: true } as const;

interface AreaFields { condition: string; cleanliness: string; description: string }

const areaPhotoCount = (area: Record<string, any>) =>
    (area.photos?.length ?? 0) + (area.items ?? []).reduce((sum: number, item: Record<string, any>) => sum + (item.photos?.length ?? 0), 0);

export default function AreaPanel({
    area,
    inspectionId,
    openItems,
    onOpenItemsChange,
    uploadingPhotos,
    onUploadAreaPhoto,
    onUploadItemPhoto,
    onOpenPhoto,
    onDirtyChange,
}: {
    area: Record<string, any>;
    inspectionId: string;
    openItems: string[];
    onOpenItemsChange: (value: string[]) => void;
    uploadingPhotos: Record<string, boolean>;
    onUploadAreaPhoto: (areaId: string, file: File) => void;
    onUploadItemPhoto: (itemId: string, file: File) => void;
    onOpenPhoto: (url: string) => void;
    onDirtyChange: (areaId: string, count: number) => void;
}) {
    const areaId = String(area.id);
    const items: Record<string, any>[] = area.items ?? [];

    const form = useForm({
        condition: area.condition ?? '',
        cleanliness: area.cleanliness ?? '',
        description: area.notes ?? '',
    });

    const save = () => {
        // The API calls this field `notes`; the UI calls it description. Going
        // through the form rather than router.patch is what lets Inertia clear
        // `isDirty` and drive `processing` when the save lands. React's
        // `transform` returns nothing (Vue's returned the form), so it is set
        // just before the patch instead of being chained onto it.
        form.transform((data: AreaFields) => ({ condition: data.condition, cleanliness: data.cleanliness, notes: data.description }));
        form.patch(route('inspections.areas.update', { inspectionId, areaId: area.id }), visitOptions);
    };

    // Nothing saves as you type, and a closed panel hides whatever is pending
    // inside it — so every level reports what it is holding. Inertia clears
    // `isDirty` itself once a form's own save succeeds.
    const [dirtyItems, setDirtyItems] = useState<Record<string, boolean>>({});

    // Identity has to be stable: the items fire this from an effect, so a new
    // function every render would re-run the effect every render.
    const onItemDirtyChange = useCallback((itemId: string, dirty: boolean) => {
        setDirtyItems((current) => (Boolean(current[itemId]) === dirty ? current : { ...current, [itemId]: dirty }));
    }, []);

    const unsavedInArea = (form.isDirty ? 1 : 0) + Object.values(dirtyItems).filter(Boolean).length;

    useEffect(() => {
        onDirtyChange(areaId, unsavedInArea);
    }, [areaId, unsavedInArea, onDirtyChange]);

    useEffect(() => () => onDirtyChange(areaId, 0), [areaId, onDirtyChange]);

    return (
        <AccordionItem value={areaId}>
            <AccordionTrigger>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{area.name}</span>
                    {area.condition && <Badge variant="outline" className="text-[10px] capitalize">{area.condition}</Badge>}
                    {area.cleanliness && <Badge variant="outline" className="text-[10px] capitalize">{area.cleanliness}</Badge>}
                    <UnsavedBadge count={unsavedInArea} />
                    <span className="ml-auto flex shrink-0 items-center gap-3 pr-2 text-xs font-normal text-muted-foreground">
                        <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
                        {areaPhotoCount(area) ? (
                            <span className="flex items-center gap-1">
                                <Images className="h-3 w-3" />{areaPhotoCount(area)}
                            </span>
                        ) : null}
                    </span>
                </div>
            </AccordionTrigger>

            <AccordionContent>
                {/* Area itself */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-2">
                        <InputGroup>
                            <InputGroupAddon className="w-28 shrink-0">Condition</InputGroupAddon>
                            <Select value={form.data.condition} onValueChange={(value) => form.setData('condition', value)}>
                                <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="Not set" /></SelectTrigger>
                                <SelectContent>{conditionOptions.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </InputGroup>
                        <InputGroup>
                            <InputGroupAddon className="w-28 shrink-0">Cleanliness</InputGroupAddon>
                            <Select value={form.data.cleanliness} onValueChange={(value) => form.setData('cleanliness', value)}>
                                <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="Not set" /></SelectTrigger>
                                <SelectContent>{cleanlinessOptions.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </InputGroup>
                        <PhraseInput
                            value={form.data.description}
                            onChange={(value) => form.setData('description', value)}
                            category="area"
                            context={area.name}
                        />
                        <div className="flex justify-end pt-1">
                            <Button size="sm" disabled={form.processing} onClick={save}>
                                <Save className="mr-2 h-3 w-3" /> Save area
                            </Button>
                        </div>
                    </div>
                    <PhotoGrid
                        photos={area.photos}
                        uploading={uploadingPhotos[areaId]}
                        onSelect={(file) => onUploadAreaPhoto(areaId, file)}
                        onOpen={onOpenPhoto}
                    />
                </div>

                <Separator className="my-4" />

                {/* Items, each its own accordion */}
                {items.length ? (
                    <Accordion type="multiple" value={openItems} onValueChange={onOpenItemsChange} className="rounded-lg border">
                        {items.map((item) => (
                            <ItemPanel
                                key={item.id}
                                item={item}
                                inspectionId={inspectionId}
                                areaName={area.name}
                                uploading={uploadingPhotos[String(item.id)]}
                                onUploadPhoto={onUploadItemPhoto}
                                onOpenPhoto={onOpenPhoto}
                                onDirtyChange={onItemDirtyChange}
                            />
                        ))}
                    </Accordion>
                ) : (
                    <p className="py-3 text-center text-sm text-muted-foreground">No items in this area.</p>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}
