/**
 * One item inside an area: its own Inertia form, its own save.
 *
 * The Vue page built a `useForm` per item inside a loop over the payload.
 * React's useForm is a hook, so it cannot run in a loop — each item gets a
 * component instead, and this is where that one form lives. Writes still go
 * back one record at a time through the item's own SDK endpoint.
 */
import { useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function ItemPanel({
    item,
    inspectionId,
    areaName,
    uploading = false,
    onUploadPhoto,
    onOpenPhoto,
    onDirtyChange,
}: {
    item: Record<string, any>;
    inspectionId: string;
    areaName?: string;
    uploading?: boolean;
    onUploadPhoto: (itemId: string, file: File) => void;
    onOpenPhoto: (url: string) => void;
    onDirtyChange: (itemId: string, dirty: boolean) => void;
}) {
    const itemId = String(item.id);

    const form = useForm({
        condition: item.condition ?? '',
        cleanliness: item.cleanliness ?? '',
        description: item.description ?? '',
    });

    const save = () => {
        form.patch(route('inspections.items.update', { inspectionId, itemId: item.id }), visitOptions);
    };

    // Nothing saves as you type, and a closed panel hides whatever is pending
    // inside it — so every level reports what it is holding. Inertia clears
    // `isDirty` itself once a form's own save succeeds. The Vue page could read
    // every form out of one map; here the form belongs to the item, so the item
    // tells the area about it instead.
    useEffect(() => {
        onDirtyChange(itemId, form.isDirty);
    }, [itemId, form.isDirty, onDirtyChange]);

    // Closing an area unmounts its items, so the count leaves with them.
    useEffect(() => () => onDirtyChange(itemId, false), [itemId, onDirtyChange]);

    return (
        <AccordionItem value={itemId}>
            <AccordionTrigger className="py-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="truncate">{item.name}</span>
                    {item.condition && <Badge variant="outline" className="text-[10px] capitalize">{item.condition}</Badge>}
                    {item.cleanliness && <Badge variant="outline" className="text-[10px] capitalize">{item.cleanliness}</Badge>}
                    {form.isDirty && <UnsavedBadge />}
                    {item.photos?.length ? (
                        <span className="ml-auto flex shrink-0 items-center gap-1 pr-2 text-xs font-normal text-muted-foreground">
                            <Images className="h-3 w-3" />{item.photos.length}
                        </span>
                    ) : null}
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-1.5">
                        <InputGroup>
                            <InputGroupAddon className="w-28 shrink-0">Condition</InputGroupAddon>
                            <Select value={form.data.condition} onValueChange={(value) => form.setData('condition', value)}>
                                <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{conditionOptions.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </InputGroup>
                        <InputGroup>
                            <InputGroupAddon className="w-28 shrink-0">Cleanliness</InputGroupAddon>
                            <Select value={form.data.cleanliness} onValueChange={(value) => form.setData('cleanliness', value)}>
                                <SelectTrigger className="w-full rounded-none border-0 shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{cleanlinessOptions.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </InputGroup>
                        <PhraseInput
                            value={form.data.description}
                            onChange={(value) => form.setData('description', value)}
                            category="item"
                            context={areaName}
                            itemName={item.name}
                        />
                        <div className="flex justify-end pt-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={form.processing} onClick={save}>
                                <Save className="mr-1.5 h-3 w-3" /> Save
                            </Button>
                        </div>
                    </div>
                    <PhotoGrid
                        photos={item.photos}
                        uploading={uploading}
                        onSelect={(file) => onUploadPhoto(itemId, file)}
                        onOpen={onOpenPhoto}
                    />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
