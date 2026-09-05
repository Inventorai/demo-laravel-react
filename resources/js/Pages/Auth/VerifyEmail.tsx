import type { FormEvent } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }: { status?: string }) {
    const form = useForm({});

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(route('verification.send'));
    };

    const verificationLinkSent = status === 'verification-link-sent';

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <p className="mb-4 text-sm text-muted-foreground">
                Thanks for signing up! Before getting started, could you verify
                your email address by clicking on the link we just emailed to
                you? If you didn't receive the email, we will gladly send you
                another.
            </p>

            {verificationLinkSent && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <form onSubmit={submit}>
                <div className="flex items-center justify-between">
                    <Button type="submit" disabled={form.processing}>
                        Resend Verification Email
                    </Button>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
