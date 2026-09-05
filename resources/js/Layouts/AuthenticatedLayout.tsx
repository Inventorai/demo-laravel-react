import { useEffect, useState, type ReactNode } from 'react';
import ApplicationLogo from '@/components/ApplicationLogo';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Link, router, usePage } from '@inertiajs/react';
import { Menu, ChevronDown, User, LogOut, Settings, Sun, Moon, ArrowRight } from 'lucide-react';
import { getEcho } from '@/lib/echo';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function AuthenticatedLayout({
    header,
    children,
}: {
    header?: ReactNode;
    children: ReactNode;
}) {
    const page = usePage();
    const { auth, flash, team_id: teamId } = page.props as any;

    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDark, toggleTheme] = useDarkMode();

    // Vue subscribed at module scope during setup; in React the subscription
    // belongs in an effect so it is torn down when the layout unmounts rather
    // than stacking up a listener per visit.
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !teamId) {
            return;
        }

        const channel = echo.private(`team.${teamId}`);
        channel.listen('.test.ping', (e: any) => {
            console.log('Received event:', e);
        });

        return () => {
            channel.stopListening('.test.ping');
        };
    }, [teamId]);

    const logout = () => {
        router.post(route('logout'));
    };

    const year = new Date().getFullYear();

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <nav className="border-b bg-card">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <Link href={route('dashboard')}>
                            <ApplicationLogo className="h-12 rounded-md" />
                        </Link>

                        <div className="hidden items-center gap-1 sm:flex">
                            <Button variant="ghost" asChild>
                                <Link href={route('dashboard')} className={route().current('dashboard') ? 'bg-accent' : ''}>
                                    Dashboard
                                </Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href={route('properties.index')} className={route().current('properties.*') ? 'bg-accent' : ''}>
                                    Properties
                                </Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href={route('inspections.index')} className={route().current('inspections.*') ? 'bg-accent' : ''}>
                                    Inspections
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="hidden sm:flex sm:items-center sm:gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2">
                                    {auth.user.name}
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={route('settings')} className="flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2">
                                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    {isDark ? 'Light mode' : 'Dark mode'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="sm:hidden">
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72">
                                <SheetHeader>
                                    <SheetTitle>Navigation</SheetTitle>
                                </SheetHeader>
                                <div className="mt-6 flex flex-col gap-2">
                                    <Button variant="ghost" className="justify-start" asChild>
                                        <Link href={route('dashboard')} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                                    </Button>
                                    <Button variant="ghost" className="justify-start" asChild>
                                        <Link href={route('properties.index')} onClick={() => setMobileOpen(false)}>Properties</Link>
                                    </Button>
                                    <Button variant="ghost" className="justify-start" asChild>
                                        <Link href={route('inspections.index')} onClick={() => setMobileOpen(false)}>Inspections</Link>
                                    </Button>

                                    <Separator className="my-2" />

                                    <div className="px-3 py-2">
                                        <p className="text-sm font-medium">{auth.user.name}</p>
                                        <p className="text-sm text-muted-foreground">{auth.user.email}</p>
                                    </div>

                                    <Button variant="ghost" className="justify-start" asChild>
                                        <Link href={route('profile.edit')} onClick={() => setMobileOpen(false)}>Profile</Link>
                                    </Button>
                                    <Button variant="ghost" className="justify-start" asChild>
                                        <Link href={route('settings')} onClick={() => setMobileOpen(false)}>Settings</Link>
                                    </Button>
                                    <Button variant="ghost" className="justify-start gap-2" onClick={toggleTheme}>
                                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                        {isDark ? 'Light mode' : 'Dark mode'}
                                    </Button>
                                    <Button variant="ghost" className="justify-start" onClick={logout}>
                                        Log Out
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="border-b bg-card">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            {flash?.error && (
                <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                        {flash.error}
                    </div>
                </div>
            )}

            {flash?.success && (
                <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                        {flash.success}
                    </div>
                </div>
            )}

            <main className="flex-1">{children}</main>

            <footer className="border-t bg-card">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    {/* Custom solution CTA */}
                    <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-10">
                        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="max-w-xl">
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    Powered by the Inventorai SDK
                                </span>
                                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                                    Need a custom solution?
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    This dashboard is a demo built on the Inventorai API. We design and build bespoke
                                    property &amp; inspection platforms around your workflow — white-label apps, custom
                                    reporting, and deep integrations.
                                </p>
                            </div>
                            <Button size="lg" asChild className="shrink-0">
                                <a href="https://inventorai.co.uk" target="_blank" rel="noopener noreferrer">
                                    Build with us
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-8 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
                        <p>© {year} Inventorai. Built with the Inventorai SDK.</p>
                        <div className="flex items-center gap-5">
                            <a href="https://docs.inventorai.co.uk" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Documentation</a>
                            <a href="https://inventorai.co.uk" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">Website</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
