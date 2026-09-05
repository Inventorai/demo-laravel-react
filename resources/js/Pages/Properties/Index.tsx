import { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Head, Link, router } from '@inertiajs/react';
import { Eye, Search, X, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { getEcho } from '@/lib/echo';
import { Skeleton } from '@/components/ui/skeleton';

export default function Index({
    properties,
    meta,
    filters,
    teamId,
    error,
}: {
    properties: Record<string, any>[];
    meta?: Record<string, any>;
    filters?: Record<string, any>;
    teamId?: string | null;
    error?: string;
}) {
    const [search, setSearch] = useState<string>(filters?.search ?? '');
    const [propertyType, setPropertyType] = useState<string>(filters?.property_type ?? '');
    const [loading, setLoading] = useState(false);

    const applyFilters = useDebouncedCallback(() => {
        const params: Record<string, any> = {};
        if (search) params.search = search;
        if (propertyType) params.property_type = propertyType;

        router.get(route('properties.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }, 300);

    // Vue used watch(search, applyFilters) / watch(propertyType, applyFilters).
    // React's equivalent is an effect on the same values, skipping the first
    // run so mounting the page does not immediately re-request the list.
    const watching = useRef(false);

    useEffect(() => {
        if (!watching.current) {
            watching.current = true;
            return;
        }

        applyFilters();
    }, [search, propertyType, applyFilters]);

    const clearFilters = () => {
        setSearch('');
        setPropertyType('');
        router.get(route('properties.index'), {}, {
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    const goToPage = (page: number) => {
        const params: Record<string, any> = { page };
        if (search) params.search = search;
        if (propertyType) params.property_type = propertyType;

        router.get(route('properties.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    // Realtime: the Inventorai API broadcasts property changes (created, updated,
    // address edits, cover/image changes, deletes) on the team.{teamId} channel.
    // Subscribe and refresh the list when one arrives. Auth is proxied through
    // /broadcasting/auth so the API token stays server-side.
    // Vue subscribed in onMounted and left the channel in onUnmounted; in React
    // both halves live in one effect so the channel is torn down with the page.
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !teamId) return;

        const refresh = () => router.reload({ only: ['properties', 'meta'] });

        echo.private(`team.${teamId}`)
            .listen('.property.created', refresh)
            .listen('.property.updated', refresh)
            .listen('.property.deleted', refresh)
            .listen('.property.image-updated', refresh);

        return () => {
            echo.leave(`team.${teamId}`);
        };
    }, [teamId]);

    return (
        <>
            <Head title="Properties" />

            <AuthenticatedLayout
                header={
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold leading-tight text-foreground">Properties</h2>
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
                                        <CardTitle>Properties</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Search address..."
                                                    className="pl-8 w-[200px]"
                                                />
                                            </div>
                                            <Select value={propertyType} onValueChange={setPropertyType}>
                                                <SelectTrigger className="w-[160px]">
                                                    <SelectValue placeholder="Property type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="house">House</SelectItem>
                                                    <SelectItem value="flat">Flat</SelectItem>
                                                    <SelectItem value="bungalow">Bungalow</SelectItem>
                                                    <SelectItem value="maisonette">Maisonette</SelectItem>
                                                    <SelectItem value="studio">Studio</SelectItem>
                                                    <SelectItem value="room">Room</SelectItem>
                                                    <SelectItem value="commercial">Commercial</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {(search || propertyType) ? (
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
                                    {!loading && properties.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Home className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <h3 className="mt-4 text-lg font-medium text-foreground">No properties found</h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {search || propertyType ? 'Try adjusting your filters.' : 'Properties from your Inventorai account will appear here.'}
                                            </p>
                                        </div>
                                    ) : loading ? (
                                        <div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead>Address</TableHead>
                                                        <TableHead>City</TableHead>
                                                        <TableHead>Postcode</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                                                        <TableRow key={`sk-${n}`}>
                                                            <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                                            <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
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
                                                        <TableHead>Address</TableHead>
                                                        <TableHead>City</TableHead>
                                                        <TableHead>Postcode</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {properties.map((property) => (
                                                        <TableRow key={property.id}>
                                                            <TableCell>
                                                                {property.image ? (
                                                                    <img
                                                                        src={property.image}
                                                                        alt={property.address?.line_1 ?? ''}
                                                                        className="h-8 w-8 rounded object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded bg-muted" />
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {property.address?.line_1 ?? '—'}
                                                            </TableCell>
                                                            <TableCell>{property.address?.city ?? '—'}</TableCell>
                                                            <TableCell>{property.address?.postcode ?? '—'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className="capitalize">
                                                                    {property.property_type ?? '—'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={property.is_residential ? 'default' : 'outline'}>
                                                                    {property.is_residential ? 'Residential' : 'Commercial'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" asChild>
                                                                    <Link href={route('properties.show', property.id)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>

                                            {meta && meta.last_page > 1 ? (
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
                                            ) : null}
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
