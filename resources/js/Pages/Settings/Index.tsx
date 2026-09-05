import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';

export default function Index({
    propertyCount,
}: {
    connected: boolean;
    propertyCount?: number;
}) {
    return (
        <>
            <Head title="Settings" />

            <AuthenticatedLayout
                header={<h2 className="text-xl font-semibold leading-tight text-foreground">Settings</h2>}
            >
                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    API Connection
                                </CardTitle>
                                <CardDescription>
                                    Status of your Inventorai API connection.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border p-4">
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className="font-medium text-green-600">Connected</span>
                                        <span className="text-muted-foreground">Properties</span>
                                        <span>{propertyCount}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
