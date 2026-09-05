import type { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const form = useForm({
        password: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('password.confirm'), {
            onFinish: () => {
                form.reset();
            },
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <p className="mb-4 text-sm text-muted-foreground">
                This is a secure area of the application. Please confirm your
                password before continuing.
            </p>

            <form onSubmit={submit} className="space-y-4">
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
                        autoFocus
                    />
                    <InputError message={form.errors.password} />
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={form.processing}>
                        Confirm
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
