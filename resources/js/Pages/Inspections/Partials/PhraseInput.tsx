/**
 * Description field backed by the phrase library.
 *
 * Typing two or more characters hits GET /phrases/search through the app's
 * own proxy (see InspectionController@searchPhrases). Results come back
 * tagged with a subcategory — Condition, Cleanliness, Defects, Attributes —
 * so they are grouped rather than listed flat, and several can be ticked and
 * appended to the description in one go.
 */
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Check } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface Phrase {
    id: string;
    text: string;
    category: string;
    context: string | null;
    subcategory?: string;
    usage_count?: number;
}

interface PhraseGroup {
    label: string;
    color: string;
    phrases: Phrase[];
}

const subcategoryConfig: Record<string, { color: string; order: number }> = {
    Condition: { color: 'text-emerald-500', order: 0 },
    Cleanliness: { color: 'text-blue-500', order: 1 },
    Defects: { color: 'text-amber-500', order: 2 },
    Attributes: { color: 'text-violet-500', order: 3 },
};

const groupPhrases = (phrases: Phrase[]): PhraseGroup[] => {
    const buckets: Record<string, Phrase[]> = {};
    phrases.forEach((p) => {
        const key = p.subcategory ?? p.context ?? 'General';
        (buckets[key] ??= []).push(p);
    });

    return Object.entries(buckets)
        .sort(([a], [b]) => (subcategoryConfig[a]?.order ?? 99) - (subcategoryConfig[b]?.order ?? 99) || a.localeCompare(b))
        .map(([label, items]) => ({
            label,
            color: subcategoryConfig[label]?.color ?? 'text-muted-foreground',
            phrases: items,
        }));
};

export default function PhraseInput({
    value,
    onChange,
    label = 'Description',
    category = 'item',
    context,
    itemName,
    placeholder = 'Type to search phrases...',
}: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    category?: 'area' | 'item' | 'element';
    context?: string;
    itemName?: string;
    placeholder?: string;
}) {
    const [groups, setGroups] = useState<PhraseGroup[]>([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Vue used @vueuse/core's useDebounceFn; the hook here keeps a stable
    // wrapper across renders while still calling the latest closure, so the
    // request sees the props this render had.
    const search = useDebouncedCallback(async (query: string) => {
        if (query.length < 2) {
            setGroups([]);
            setOpen(false);
            return;
        }

        try {
            const params: Record<string, string> = { q: query, category };
            if (context) params.context = context;
            if (itemName) params.item_name = itemName;

            const { data } = await axios.get(route('api.phrases.search'), { params });
            const next = groupPhrases(data ?? []);
            setGroups(next);
            setOpen(next.length > 0);
        } catch {
            setGroups([]);
        }
    }, 300);

    const onInput = (next: string) => {
        onChange(next);
        search(next);
    };

    const toggle = (text: string) => {
        const next = new Set(selected);
        next.has(text) ? next.delete(text) : next.add(text);
        setSelected(next);
    };

    const confirm = () => {
        if (selected.size) {
            const existing = value ? `${value}. ` : '';
            onChange(existing + Array.from(selected).join('. '));
            setSelected(new Set());
        }
        setOpen(false);
    };

    // The dropdown closes on blur, but only after the click that caused the blur
    // has had a chance to land on one of its buttons.
    const close = () => globalThis.setTimeout(() => { setOpen(false); }, 200);

    return (
        <div className="relative">
            <InputGroup>
                <InputGroupAddon className="w-28 shrink-0">{label}</InputGroupAddon>
                <InputGroupInput
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onInput(e.target.value)}
                    onFocus={() => { if (groups.length) setOpen(true); }}
                    onBlur={close}
                />
            </InputGroup>

            {open && groups.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                    {groups.map((group) => (
                        <Fragment key={group.label}>
                            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                                <span className={cn('text-xs', group.color)}>{'●'}</span>
                                <span className={cn('text-xs font-semibold', group.color)}>{group.label}</span>
                                <span className="text-xs text-muted-foreground">({group.phrases.length})</span>
                            </div>
                            {group.phrases.map((phrase) => (
                                <button
                                    key={phrase.id}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                    onMouseDown={(e) => { e.preventDefault(); toggle(phrase.text); }}
                                >
                                    <div
                                        className={cn(
                                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                            selected.has(phrase.text) ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                                        )}
                                    >
                                        {selected.has(phrase.text) && <Check className="h-3 w-3" />}
                                    </div>
                                    <span className="flex-1">{phrase.text}</span>
                                    {phrase.usage_count ? (
                                        <span className="shrink-0 text-xs text-muted-foreground">{phrase.usage_count}x</span>
                                    ) : null}
                                </button>
                            ))}
                        </Fragment>
                    ))}

                    {selected.size > 0 && (
                        <div className="sticky bottom-0 flex items-center justify-between border-t bg-popover p-2">
                            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                            <Button size="sm" className="h-7 text-xs" onMouseDown={(e) => { e.preventDefault(); confirm(); }}>
                                Add to {label.toLowerCase()}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
