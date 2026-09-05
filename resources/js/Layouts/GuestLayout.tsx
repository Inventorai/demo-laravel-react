import type { ReactNode } from 'react';
import ApplicationLogo from '@/components/ApplicationLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="mb-6">
                <Link href="/">
                    <ApplicationLogo className="h-16 w-16 text-foreground rounded-lg" />
                </Link>
            </div>

            <Card className="w-full max-w-md">
                <CardContent className="pt-6">{children}</CardContent>
            </Card>
        </div>
    );
}
