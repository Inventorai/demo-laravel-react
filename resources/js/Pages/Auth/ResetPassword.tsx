import type { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({
    email,
    token,
}: {
    email: string;
    token: string;
}) {
    const form = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('password.store'), {
            onFinish: () => {
                form.reset('password', 'password_confirmation');
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

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
                        autoComplete="new-password"
                    />
                    <InputError message={form.errors.password} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">
                        Confirm Password
                    </Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData('password_confirmation', e.target.value)
                        }
                        required
                        autoComplete="new-password"
                    />
                    <InputError message={form.errors.password_confirmation} />
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={form.processing}>
                        Reset Password
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
