import { Fragment, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { getEcho } from '@/lib/echo';

export default function Show({
    property,
    teamId,
}: {
    property: Record<string, any>;
    teamId?: string | null;
}) {
    const humanize = (value: string) => value.replace(/_/g, ' ');

    // Realtime: react when THIS property changes. Property events broadcast on the
    // team.{teamId} channel and carry the property id, so we filter to ours.
    // Vue subscribed in onMounted and left the channel in onUnmounted; in React
    // both halves live in one effect so the channel is torn down with the page.
    // The id is read through a ref because Vue's handlers read the reactive
    // `props.property.id` — putting it in the deps instead would leave and
    // rejoin `team.{teamId}` on every property, and the layout listens there too.
    const propertyId = useRef<string>(property.id);
    propertyId.current = property.id;

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !teamId) return;

        const refreshIfMine = (e: { id?: string }) => {
            if (e?.id === propertyId.current) {
                router.reload({ only: ['property'] });
            }
        };

        echo.private(`team.${teamId}`)
            .listen('.property.updated', refreshIfMine)
            .listen('.property.image-updated', refreshIfMine)
            .listen('.property.deleted', (e: { id?: string }) => {
                if (e?.id === propertyId.current) {
                    router.visit(route('properties.index'));
                }
            });

        return () => {
            echo.leave(`team.${teamId}`);
        };
    }, [teamId]);

    return (
        <>
            <Head title={property.address?.line_1 ?? `Property #${property.id}`} />

            <AuthenticatedLayout
                header={
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={route('properties.index')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">
                            {property.address?.full_address ?? `Property #${property.id}`}
                        </h2>
                    </div>
                }
            >
                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                        {/* Cover image + details */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-6 sm:flex-row">
                                    {property.image && (
                                        <div className="shrink-0">
                                            <img
                                                src={property.image}
                                                alt={property.address?.full_address ?? ''}
                                                className="h-48 w-72 rounded-lg object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{property.address?.line_1}</h3>
                                            {property.address?.line_2 && (
                                                <p className="text-sm text-muted-foreground">{property.address.line_2}</p>
                                            )}
                                            <p className="text-sm text-muted-foreground">
                                                {[property.address?.city, property.address?.county, property.address?.postcode].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="secondary" className="capitalize">{property.property_type}</Badge>
                                            <Badge variant={property.is_residential ? 'default' : 'outline'}>
                                                {property.is_residential ? 'Residential' : 'Commercial'}
                                            </Badge>
                                        </div>
                                        {property.created_at && (
                                            <div className="text-xs text-muted-foreground">
                                                Added {property.created_at}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Landlord */}
                        {property.landlord && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Landlord</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {/* Vue's mustache stringifies every scalar; React drops booleans,
                                            so String() keeps a `false` landlord flag visible. */}
                                        {Object.entries(property.landlord as Record<string, any>).map(([key, value]) => (
                                            typeof value !== 'object' || value === null ? (
                                                <Fragment key={key}>
                                                    <div className="text-sm text-muted-foreground capitalize">{humanize(String(key))}</div>
                                                    <div className="text-sm">{String(value ?? '—')}</div>
                                                </Fragment>
                                            ) : null
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Inspections */}
                        {property.inspections?.length ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Inspections ({property.inspections.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {property.inspections.map((inspection: Record<string, any>) => (
                                            <div
                                                key={inspection.id}
                                                className="flex items-center justify-between rounded-lg border p-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium capitalize">{humanize(inspection.type ?? `Inspection #${inspection.id}`)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {inspection.scheduled_at ?? inspection.created_at ?? '—'}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className="capitalize">
                                                    {humanize(inspection.status ?? '—')}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* Raw JSON */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Raw JSON</CardTitle>
                                <CardDescription>Full API response</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs"><code>{JSON.stringify(property, null, 2)}</code></pre>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
