import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Link, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

export default function UpdateProfileInformationForm({
    mustVerifyEmail,
    status,
    className,
}: {
    mustVerifyEmail?: boolean;
    status?: string;
    // Vue merged the parent's `class` onto the root element automatically;
    // React has no attribute fallthrough, so the class arrives as a prop.
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const form = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('profile.update'));
    };

    return (
        <form onSubmit={submit} className={cn('space-y-6', className)}>
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    type="text"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    required
                    autoFocus
                    autoComplete="name"
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    required
                    autoComplete="username"
                />
                <InputError message={form.errors.email} />
            </div>

            {mustVerifyEmail && user.email_verified_at === null && (
                <div>
                    <p className="text-sm text-foreground">
                        {/* JSX drops the newline-only whitespace between this text
                            and the link, where Vue's template condensed it to a
                            single space, so the space is written explicitly. */}
                        Your email address is unverified.{' '}
                        <Link
                            href={route('verification.send')}
                            method="post"
                            as="button"
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            Click here to re-send the verification email.
                        </Link>
                    </p>

                    {/* v-show kept the node mounted and toggled display, so this
                        mirrors it with an inline style rather than v-if's unmount. */}
                    <div
                        style={{
                            display:
                                status === 'verification-link-sent'
                                    ? undefined
                                    : 'none',
                        }}
                        className="mt-2 text-sm font-medium text-green-600"
                    >
                        A new verification link has been sent to your email address.
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4">
                <Button type="submit" disabled={form.processing}>Save</Button>

                {/* Vue wrapped this in <Transition> to fade the message in and out;
                    React has no built-in equivalent, so the node is simply
                    mounted while `recentlySuccessful` is true. */}
                {form.recentlySuccessful && (
                    <p className="text-sm text-muted-foreground">
                        Saved.
                    </p>
                )}
            </div>
        </form>
    );
}
