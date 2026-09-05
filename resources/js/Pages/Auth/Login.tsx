import type { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({
    canResetPassword,
    status,
}: {
    canResetPassword?: boolean;
    status?: string;
}) {
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('login'), {
            onFinish: () => {
                form.reset('password');
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="you@example.com"
                    />
                    <InputError message={form.errors.email} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                        required
                        autoComplete="current-password"
                    />
                    <InputError message={form.errors.password} />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="remember"
                        checked={form.data.remember}
                        onCheckedChange={(checked) =>
                            form.setData('remember', checked === true)
                        }
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">
                        Remember me
                    </Label>
                </div>

                <div className="flex items-center justify-between pt-2">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            Forgot your password?
                        </Link>
                    )}

                    <Button type="submit" disabled={form.processing}>
                        Log in
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link
                        href={route('register')}
                        className="underline underline-offset-4 hover:text-foreground"
                    >
                        Register
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
