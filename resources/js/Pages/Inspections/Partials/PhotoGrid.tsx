/**
 * Thumbnail grid with an upload tile in the first cell.
 *
 * The parent owns the upload request — every record type posts to its own
 * SDK endpoint — so this only hands back the chosen File.
 */
import { type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

export default function PhotoGrid({
    photos = [],
    uploading = false,
    columns = 6,
    readonly = false,
    onSelect,
    onOpen,
}: {
    photos?: Record<string, any>[];
    uploading?: boolean;
    columns?: number;
    readonly?: boolean;
    onSelect: (file: File) => void;
    onOpen: (url: string) => void;
}) {
    const thumb = (photo: Record<string, any>) => photo.thumbnail_url ?? photo.url;
    const full = (photo: Record<string, any>) => photo.original_url ?? photo.url;

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        if (!input.files?.length) return;
        onSelect(input.files[0]);
        input.value = '';
    };

    return (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {!readonly && (
                <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    <span className="mt-1 text-[10px]">{uploading ? 'Uploading' : 'Upload'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={onChange} />
                </label>
            )}
            {photos.map((photo) => (
                <img
                    key={photo.id}
                    src={thumb(photo)}
                    className="aspect-square w-full cursor-pointer rounded-md object-cover transition-opacity hover:opacity-80"
                    onClick={() => onOpen(full(photo))}
                />
            ))}
        </div>
    );
}
