import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    canLogin,
    canRegister,
}: {
    canLogin?: boolean;
    canRegister?: boolean;
    laravelVersion: string;
    phpVersion: string;
}) {
    return (
        <>
            <Head title="Welcome" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
                <div className="w-full max-w-2xl space-y-8">
                    <div className="flex flex-col items-center gap-4">
                        <div>
                            <img src="/images/logo/iai_logo.svg" alt="Inventorai" className="h-16 rounded-full" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Inventorai SDK Demo App
                        </h1>
                        <p className="text-muted-foreground">
                            Explore the Inventorai SDK integration with Laravel
                        </p>
                    </div>

                    {canLogin && (
                        <div className="flex items-center justify-center gap-4">
                            <Button asChild>
                                <Link href={route('login')}>Log in</Link>
                            </Button>
                            {canRegister && (
                                <Button variant="outline" asChild>
                                    <Link href={route('register')}>Register</Link>
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="grid gap-6 sm:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Documentation</CardTitle>
                                <CardDescription>
                                    Read the Inventorai SDK documentation for guides, API references, and integration examples.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="link" className="h-auto p-0" asChild>
                                    <a href="https://docs.inventorai.co.uk" target="_blank" rel="noopener noreferrer">
                                        Read the docs &rarr;
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Inventorai</CardTitle>
                                <CardDescription>
                                    Learn more about Inventorai and how it can help streamline your property inventory workflows.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="link" className="h-auto p-0" asChild>
                                    <a href="https://inventorai.co.uk" target="_blank" rel="noopener noreferrer">
                                        Visit our website &rarr;
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
