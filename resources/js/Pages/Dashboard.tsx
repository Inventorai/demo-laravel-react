import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Head } from '@inertiajs/react';
import { Home, ClipboardCheck, CheckCircle, Clock, TrendingUp, type LucideIcon } from 'lucide-react';
import { VisDonut, VisSingleContainer, VisGroupedBar, VisAxis, VisXYContainer, VisTooltip } from '@unovis/react';
import { Donut, GroupedBar } from '@unovis/ts';

type PropertyTypeDatum = { type: string; count: number };
type InspectionTypeDatum = { type: string; count: number };
type InspectionStatusDatum = { status: string; count: number };

type Props = {
    stats: {
        totalProperties: number;
        totalInspections: number;
        completedInspections: number;
        inProgressInspections: number;
    };
    charts: {
        propertyTypes: PropertyTypeDatum[];
        inspectionTypes: InspectionTypeDatum[];
        inspectionStatuses: InspectionStatusDatum[];
    };
};

const humanize = (value: string) => value.replace(/_/g, ' ');

const rate = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

type StatCard = {
    label: string;
    value: string;
    icon: LucideIcon;
    badge: string;
    trend: boolean;
    footer: string;
    sub: string;
};

const statusColors: Record<string, string> = {
    completed: 'var(--color-chart-2)',
    in_progress: 'var(--color-chart-1)',
    draft: 'var(--color-chart-4)',
    in_review: 'var(--color-chart-5)',
};

// Green palette for the property-types donut (light → dark)
const greenRamp = ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'];

export default function Dashboard({ stats, charts }: Props) {
    const completionRate = rate(stats.completedInspections, stats.totalInspections);
    const inProgressRate = rate(stats.inProgressInspections, stats.totalInspections);

    // Real totals from the API (meta.total), not the per_page=100 chart sample
    const propertyTotal = stats.totalProperties;
    const inspectionStatusTotal = stats.totalInspections;

    const statCards: StatCard[] = [
        {
            label: 'Properties',
            value: stats.totalProperties.toLocaleString(),
            icon: Home,
            badge: 'Portfolio',
            trend: false,
            footer: 'Across your managed portfolio',
            sub: 'Total properties on record',
        },
        {
            label: 'Inspections',
            value: stats.totalInspections.toLocaleString(),
            icon: ClipboardCheck,
            badge: 'All time',
            trend: false,
            footer: 'Every inspection created',
            sub: 'Across all properties',
        },
        {
            label: 'Completed',
            value: stats.completedInspections.toLocaleString(),
            icon: CheckCircle,
            badge: `${completionRate}%`,
            trend: true,
            footer: 'Healthy completion rate',
            sub: `${completionRate}% of all inspections`,
        },
        {
            label: 'In Progress',
            value: stats.inProgressInspections.toLocaleString(),
            icon: Clock,
            badge: `${inProgressRate}%`,
            trend: true,
            footer: 'Currently being worked on',
            sub: `${inProgressRate}% of all inspections`,
        },
    ];

    // Hover tooltips for the charts
    const propertyTypeTriggers = {
        [Donut.selectors.segment]: (d: { data: PropertyTypeDatum }) => `${humanize(d.data.type)}: ${d.data.count}`,
    };
    const inspectionStatusTriggers = {
        [Donut.selectors.segment]: (d: { data: InspectionStatusDatum }) => `${humanize(d.data.status)}: ${d.data.count}`,
    };
    const inspectionTypeTriggers = {
        [GroupedBar.selectors.bar]: (d: InspectionTypeDatum) => `${humanize(d.type)}: ${d.count}`,
    };

    return (
        <>
            <Head title="Dashboard" />

            <AuthenticatedLayout
                header={<h2 className="text-xl font-semibold leading-tight text-foreground">Dashboard</h2>}
            >
                <div className="py-8">
                    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                        {/* Stat cards */}
                        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {statCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <Card key={card.label} className="@container/card">
                                        <CardHeader>
                                            <CardDescription>{card.label}</CardDescription>
                                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{card.value}</CardTitle>
                                            <CardAction>
                                                <Badge variant="outline">
                                                    {card.trend ? <TrendingUp /> : <Icon />}
                                                    {card.badge}
                                                </Badge>
                                            </CardAction>
                                        </CardHeader>
                                        <CardFooter className="flex-col items-start gap-1.5 text-sm">
                                            <div className="line-clamp-1 flex items-center gap-2 font-medium">
                                                {card.footer}
                                                <Icon className="size-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-muted-foreground">{card.sub}</div>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Charts */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Donuts (combined, charts only) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Distribution</CardTitle>
                                    <CardDescription>Properties by type and inspections by status</CardDescription>
                                </CardHeader>
                                <CardContent className="flex h-full items-center">
                                    <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-[180px] w-[180px] overflow-hidden">
                                                <VisSingleContainer height={180} data={charts.propertyTypes}>
                                                    <VisDonut
                                                        value={(d: PropertyTypeDatum) => d.count}
                                                        color={(_d: PropertyTypeDatum, i: number) => greenRamp[i % greenRamp.length]}
                                                        arcWidth={30}
                                                        centralLabelOffsetY={10}
                                                        centralLabel={String(propertyTotal)}
                                                        centralSubLabel={'Properties'}
                                                    />
                                                    <VisTooltip triggers={propertyTypeTriggers} />
                                                </VisSingleContainer>
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">Property Types</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-[180px] w-[180px] overflow-hidden">
                                                <VisSingleContainer height={180} data={charts.inspectionStatuses}>
                                                    <VisDonut
                                                        value={(d: InspectionStatusDatum) => d.count}
                                                        color={(d: InspectionStatusDatum) => statusColors[d.status] ?? 'var(--color-chart-3)'}
                                                        arcWidth={30}
                                                        centralLabelOffsetY={10}
                                                        centralLabel={String(inspectionStatusTotal)}
                                                        centralSubLabel={'Inspections'}
                                                    />
                                                    <VisTooltip triggers={inspectionStatusTriggers} />
                                                </VisSingleContainer>
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">Inspection Status</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Inspections by Type Bar */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Inspections by Type</CardTitle>
                                    <CardDescription>Breakdown of inspection types across your account</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <VisXYContainer
                                            data={charts.inspectionTypes}
                                            height={300}
                                            yDomain={[0, undefined]}
                                        >
                                            <VisGroupedBar
                                                x={(_d: InspectionTypeDatum, i: number) => i}
                                                y={(d: InspectionTypeDatum) => d.count}
                                                roundedCorners={10}
                                                color={'var(--color-primary)'}
                                            />
                                            <VisTooltip triggers={inspectionTypeTriggers} />
                                            <VisAxis
                                                type="x"
                                                gridLine={false}
                                                tickFormat={(i: number | Date) => (charts.inspectionTypes[Number(i)] ? humanize(charts.inspectionTypes[Number(i)].type) : '')}
                                                tickTextWidth={80}
                                            />
                                            <VisAxis type="y" tickFormat={(v: number | Date) => String(Math.round(Number(v)))}
                                            />
                                        </VisXYContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
