import type { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }: { status?: string }) {
    const form = useForm({
        email: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <p className="mb-4 text-sm text-muted-foreground">
                Forgot your password? No problem. Just let us know your email
                address and we will email you a password reset link that will
                allow you to choose a new one.
            </p>

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

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={form.processing}>
                        Email Password Reset Link
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
