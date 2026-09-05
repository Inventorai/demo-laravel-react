/**
 * Compliance — Inventorai::compliance().
 *
 * When a form is attached to an inspection the API snapshots the team's
 * template, so what arrives here is that inspection's own copy: forms →
 * sections → fields, each field carrying the response for this inspection.
 * The `complianceForms` include flattens that into `items`, which is the
 * shape the mobile app works from and the shape used below.
 *
 * Answers save one field at a time via
 * compliance()->updateResponse($inspectionId, $fieldId, ['value' => ...]).
 * The API types the stored value from the field's own field_type, so a yes_no
 * field is sent a boolean and a date field an ISO date string.
 */
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CircleAlert, CircleCheck, CircleDashed, ExternalLink, Save, type LucideIcon } from 'lucide-react';
import UnsavedBadge from './UnsavedBadge';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { useUnsavedSource } from '@/hooks/useUnsavedGuard';

/** Answer choices for the yes/no family. Everything else gets a text control. */
const choicesFor = (type: string): { label: string; value: boolean | null }[] | null => {
    switch (type) {
        case 'pass_fail':
            return [{ label: 'Pass', value: true }, { label: 'Fail', value: false }];
        case 'yes_no_na':
            return [{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'N/A', value: null }];
        case 'yes_no':
        case 'boolean':
            return [{ label: 'Yes', value: true }, { label: 'No', value: false }];
        default:
            return null;
    }
};

const inputTypeFor = (type: string) => (type === 'date' ? 'date' : type === 'number' ? 'number' : 'text');

/** Fields the API fills from an upload or an external link — read-only here. */
const isReadOnly = (type: string) => type === 'file' || type === 'link';

const buildDrafts = (list?: Record<string, any>[]) => {
    const next: Record<string, any> = {};
    (list ?? []).forEach((form) => {
        (form.items ?? []).forEach((item: Record<string, any>) => {
            next[item.id] = item.value ?? '';
        });
    });
    return next;
};

/** unanswered → outstanding; answered → compliant or not, per the API's own verdict. */
const statusOf = (item: Record<string, any>) => {
    if (!item.has_response) return item.is_required ? 'required' : 'unanswered';
    return item.is_compliant ? 'compliant' : 'issue';
};

const statusIcon: Record<string, LucideIcon> = {
    compliant: CircleCheck,
    issue: CircleAlert,
    required: CircleAlert,
    unanswered: CircleDashed,
};

const statusColor: Record<string, string> = {
    compliant: 'text-emerald-500',
    issue: 'text-red-500',
    required: 'text-amber-500',
    unanswered: 'text-muted-foreground',
};

/** Items keep their form order; grouping preserves the section they came from. */
const sectionsOf = (form: Record<string, any>) => {
    const groups: { id: string; name: string; items: Record<string, any>[] }[] = [];
    (form.items ?? []).forEach((item: Record<string, any>) => {
        const key = String(item.section_id ?? item.section_name ?? '');
        const existing = groups.find((g) => g.id === key);
        if (existing) existing.items.push(item);
        else groups.push({ id: key, name: item.section_name ?? 'Questions', items: [item] });
    });
    return groups;
};

const outstanding = (form: Record<string, any>) => (form.total_items ?? 0) - (form.completed_items ?? 0);

export default function ComplianceCard({
    inspectionId,
    forms,
    open,
    onOpenChange,
}: {
    inspectionId: string;
    forms?: Record<string, any>[];
    open: string[];
    onOpenChange: (value: string[]) => void;
}) {
    // One draft per field, rebuilt from the payload after every save. Vue did
    // that in a `watch(..., { immediate: true })`, which runs before the first
    // render; an effect would run *after* it and flash the previous answers, so
    // the payload is compared during render instead.
    const formsKey = JSON.stringify(forms ?? []);
    const [drafts, setDrafts] = useState(() => buildDrafts(forms));
    const [builtFrom, setBuiltFrom] = useState(formsKey);

    if (builtFrom !== formsKey) {
        setBuiltFrom(formsKey);
        setDrafts(buildDrafts(forms));
    }

    const setDraft = (fieldId: string, value: string) => {
        setDrafts((current) => ({ ...current, [fieldId]: value }));
    };

    const [busy, setBusy] = useState<Record<string, boolean>>({});

    const answer = (fieldId: string, value: string | number | boolean | null) => {
        setBusy((current) => ({ ...current, [fieldId]: true }));
        router.patch(route('inspections.compliance.update', { inspectionId, fieldId }), { value }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setBusy((current) => ({ ...current, [fieldId]: false })); },
        });
    };

    const saveDraft = (item: Record<string, any>) => {
        const draft = drafts[item.id];
        answer(item.id, draft === '' ? null : item.item_type === 'number' ? Number(draft) : draft);
    };

    const isDirty = (item: Record<string, any>) => String(drafts[item.id] ?? '') !== String(item.value ?? '');

    // Yes/no answers save on click, so only the typed field types can go stale —
    // and a closed form hides them, hence the count on the trigger.
    const dirtyCount = (form: Record<string, any>) => (form.items ?? []).filter((item: Record<string, any>) => isDirty(item)).length;

    const dirtyTotal = (forms ?? []).reduce((sum, form) => sum + dirtyCount(form), 0);
    useUnsavedSource(dirtyTotal);

    const totals = (forms ?? []).reduce((acc, form) => ({
        total: acc.total + (form.total_items ?? 0),
        completed: acc.completed + (form.completed_items ?? 0),
    }), { total: 0, completed: 0 });

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <CardTitle>Compliance</CardTitle>
                    <Badge variant="secondary">{forms?.length ?? 0} form{forms?.length === 1 ? '' : 's'}</Badge>
                    {totals.total ? (
                        <Badge variant={totals.completed === totals.total ? 'default' : 'outline'}>
                            {totals.completed} / {totals.total} answered
                        </Badge>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent>
                {forms?.length ? (
                    <Accordion type="multiple" value={open} onValueChange={onOpenChange} className="rounded-lg border">
                        {forms.map((form) => (
                            <AccordionItem key={form.form_id} value={String(form.form_id)}>
                                <AccordionTrigger>
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <span className="truncate">{form.form_name}</span>
                                        {form.category ? <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{form.category}</Badge> : null}
                                        <UnsavedBadge count={dirtyCount(form)} />
                                        <span className="ml-auto shrink-0 pr-2 text-xs font-normal text-muted-foreground">
                                            {form.completed_items ?? 0} / {form.total_items ?? 0}{' '}
                                            {outstanding(form) > 0 && <span className="text-amber-500">· {outstanding(form)} outstanding</span>}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {!form.items?.length && (
                                        <div className="py-3 text-sm text-muted-foreground">
                                            This form has no questions.
                                        </div>
                                    )}

                                    {sectionsOf(form).map((section) => (
                                        <div key={section.id} className="mb-4 last:mb-0">
                                            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{section.name}</p>
                                            <div className="space-y-2">
                                                {section.items.map((item) => {
                                                    const status = statusOf(item);
                                                    const StatusIcon = statusIcon[status];
                                                    const choices = choicesFor(item.item_type);

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex flex-col gap-2 rounded-md border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div className="flex min-w-0 items-start gap-2">
                                                                <StatusIcon
                                                                    className={cn('mt-0.5 h-4 w-4 shrink-0', statusColor[status])}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm">
                                                                        {item.item_name}{' '}
                                                                        {item.is_required ? <span className="text-red-500">*</span> : null}
                                                                    </p>
                                                                    {item.help_text ? <p className="text-xs text-muted-foreground">{item.help_text}</p> : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-1.5 sm:pl-4">
                                                                {choices ? (
                                                                    // Yes / No / Pass / Fail
                                                                    choices.map((choice) => (
                                                                        <Button
                                                                            key={String(choice.value)}
                                                                            size="sm"
                                                                            className="h-7 min-w-14 text-xs"
                                                                            variant={item.has_response && item.value === choice.value ? 'default' : 'outline'}
                                                                            disabled={busy[item.id]}
                                                                            onClick={() => answer(item.id, choice.value)}
                                                                        >
                                                                            {choice.label}
                                                                        </Button>
                                                                    ))
                                                                ) : isReadOnly(item.item_type) ? (
                                                                    // Uploads and links are set elsewhere; show what the API holds
                                                                    item.display_value ? (
                                                                        <a
                                                                            href={item.display_value}
                                                                            target="_blank"
                                                                            rel="noopener"
                                                                            className="flex items-center gap-1 text-xs text-muted-foreground underline"
                                                                        >
                                                                            <ExternalLink className="h-3 w-3" /> View
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">Not provided</span>
                                                                    )
                                                                ) : item.item_type === 'textarea' ? (
                                                                    // Free text
                                                                    <>
                                                                        <Textarea
                                                                            value={drafts[item.id]}
                                                                            onChange={(e) => setDraft(item.id, e.target.value)}
                                                                            className="min-h-9 w-64 py-1.5 text-sm"
                                                                            placeholder="Not answered"
                                                                        />
                                                                        {isDirty(item) && (
                                                                            <Button size="sm" className="h-7 text-xs" disabled={busy[item.id]} onClick={() => saveDraft(item)}>
                                                                                <Save className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Input
                                                                            value={drafts[item.id]}
                                                                            onChange={(e) => setDraft(item.id, e.target.value)}
                                                                            type={inputTypeFor(item.item_type)}
                                                                            className="h-8 w-48 text-sm"
                                                                            placeholder="Not answered"
                                                                            onKeyUp={(e) => { if (e.key === 'Enter') saveDraft(item); }}
                                                                        />
                                                                        {isDirty(item) && (
                                                                            <Button size="sm" className="h-7 text-xs" disabled={busy[item.id]} onClick={() => saveDraft(item)}>
                                                                                <Save className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No compliance forms attached to this inspection.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
