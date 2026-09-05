import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Head, Link, router } from '@inertiajs/react';
import { X, ClipboardCheck, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getEcho } from '@/lib/echo';

const humanize = (value: string) => value.replace(/_/g, ' ');

export default function Index({
    inspections,
    meta,
    filters,
    error,
    teamId,
}: {
    inspections: Record<string, any>[];
    meta?: Record<string, any>;
    filters?: Record<string, any>;
    error?: string;
    teamId?: string | null;
}) {
    const [status, setStatus] = useState<string>(filters?.status ?? '');
    const [type, setType] = useState<string>(filters?.type ?? '');
    const [loading, setLoading] = useState(false);

    // Live updates: the API broadcasts inspection changes on the team's private
    // channel, so the list refreshes itself instead of waiting for a reload.
    // Auth is proxied through /broadcasting/auth to keep the API token server-side.
    // Vue subscribed in onMounted and left the channel in onUnmounted; in React
    // both halves live in one effect so the channel is torn down with the page.
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !teamId) return;

        const refresh = () => router.reload({ only: ['inspections', 'meta'] });

        echo.private(`team.${teamId}`)
            .listen('.inspection.created', refresh)
            .listen('.inspection.updated', refresh)
            .listen('.inspection.deleted', refresh)
            .listen('.inspection.auto-completed', refresh)
            .listen('.inspections.archived', refresh);

        return () => {
            echo.leave(`team.${teamId}`);
        };
    }, [teamId]);

    // Vue watched the two filter refs; React applies the visit straight from the
    // change handler with the incoming value, so there is no first-run visit and
    // no stale read of the state that is still being set.
    const applyFilters = (nextStatus: string, nextType: string) => {
        const params: Record<string, any> = {};
        if (nextStatus) params.status = nextStatus;
        if (nextType) params.type = nextType;

        router.get(route('inspections.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    const clearFilters = () => {
        setStatus('');
        setType('');
        router.get(route('inspections.index'), {}, {
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    const goToPage = (page: number) => {
        const params: Record<string, any> = { page };
        if (status) params.status = status;
        if (type) params.type = type;

        router.get(route('inspections.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    return (
        <>
            <Head title="Inspections" />

            <AuthenticatedLayout
                header={
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold leading-tight text-foreground">Inspections</h2>
                        {meta?.total ? (
                            <span className="text-sm text-muted-foreground">
                                {meta.total} total
                            </span>
                        ) : null}
                    </div>
                }
            >
                <div className="py-12">
                    <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                        {error ? (
                            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                                {error}
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <CardTitle>Inspections</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={type}
                                                onValueChange={(value) => {
                                                    setType(value);
                                                    applyFilters(status, value);
                                                }}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Type" />
                                                </SelectTrigger>
                                                {/* Vue's SelectLabel injects a default group context, so the source
                                                    listed the labels directly inside SelectContent. Radix throws
                                                    ("SelectLabel must be used within SelectGroup") without one, so each
                                                    labelled block is wrapped; the rendered order is unchanged. */}
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel className="text-xs text-muted-foreground">Tenancy</SelectLabel>
                                                        <SelectItem value="move_in">Move In</SelectItem>
                                                        <SelectItem value="periodic">Periodic</SelectItem>
                                                        <SelectItem value="move_out">Move Out</SelectItem>
                                                    </SelectGroup>
                                                    <SelectSeparator />
                                                    <SelectGroup>
                                                        <SelectLabel className="text-xs text-muted-foreground">Non-Tenancy</SelectLabel>
                                                        <SelectItem value="vacant">Vacant</SelectItem>
                                                        <SelectItem value="pre_tenancy">Pre-Tenancy</SelectItem>
                                                        <SelectItem value="landlord_only">Landlord Inventory</SelectItem>
                                                        <SelectItem value="between_tenancies">Between Tenancies</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={status}
                                                onValueChange={(value) => {
                                                    setStatus(value);
                                                    applyFilters(value, type);
                                                }}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="in_review">In Review</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(type || status) ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={clearFilters}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!loading && inspections.length === 0 ? (
                                        <div className="text-center py-12">
                                            <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <h3 className="mt-4 text-lg font-medium text-foreground">No inspections found</h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {type || status ? 'Try adjusting your filters.' : 'Inspections from your Inventorai account will appear here.'}
                                            </p>
                                        </div>
                                    ) : loading ? (
                                        <div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead>Property</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Inspector</TableHead>
                                                        <TableHead>Depth</TableHead>
                                                        <TableHead>Defects</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                                                        <TableRow key={`sk-${n}`}>
                                                            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                                            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                                            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead>Property</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Inspector</TableHead>
                                                        <TableHead>Depth</TableHead>
                                                        <TableHead>Defects</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {inspections.map((inspection) => (
                                                        <TableRow key={inspection.id}>
                                                            <TableCell>
                                                                {inspection.property?.image ? (
                                                                    <img
                                                                        src={inspection.property.image}
                                                                        alt={inspection.property?.address?.line_1 ?? ''}
                                                                        className="h-8 w-8 rounded object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded bg-muted" />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="font-medium">{inspection.property?.address?.line_1 ?? '—'}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {[inspection.property?.address?.city, inspection.property?.address?.postcode].filter(Boolean).join(', ')}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="capitalize">
                                                                    {humanize(inspection.type ?? '—')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={inspection.status === 'completed' ? 'default' : 'secondary'}
                                                                    className="capitalize"
                                                                >
                                                                    {humanize(inspection.status ?? '—')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap">
                                                                {inspection.scheduled_at ?? '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {inspection.inspector?.name ?? '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="capitalize">
                                                                    {humanize(inspection.inspection_depth ?? '—')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {inspection.statistics ? (
                                                                    <span>
                                                                        {inspection.statistics.total_defects}{' '}
                                                                        {inspection.statistics.critical_defects ? (
                                                                            <span className="text-red-500 text-xs">
                                                                                ({inspection.statistics.critical_defects} critical)
                                                                            </span>
                                                                        ) : null}
                                                                    </span>
                                                                ) : (
                                                                    <span>—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" asChild>
                                                                    <Link href={route('inspections.show', inspection.id)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>

                                            {meta && meta.last_page > 1 && (
                                                <div className="mt-4 flex items-center justify-between">
                                                    <p className="text-sm text-muted-foreground">
                                                        Page {meta.current_page} of {meta.last_page}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={meta.current_page <= 1}
                                                            onClick={() => goToPage(meta.current_page - 1)}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                            Previous
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={meta.current_page >= meta.last_page}
                                                            onClick={() => goToPage(meta.current_page + 1)}
                                                        >
                                                            Next
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
