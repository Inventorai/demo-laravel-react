import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { useRef, type FormEventHandler } from 'react';

export default function UpdatePasswordForm({
    className,
}: {
    // Vue merged the parent's `class` onto the root element automatically;
    // React has no attribute fallthrough, so the class arrives as a prop.
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        form.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
            },
            // Vue read `form.errors` straight off the reactive form here; in React
            // that closure would still hold the pre-request (empty) errors, so the
            // fresh errors come in as the callback argument instead.
            onError: (errors) => {
                if (errors.password) {
                    form.reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errors.current_password) {
                    form.reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <form onSubmit={updatePassword} className={cn('space-y-6', className)}>
            <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                    id="current_password"
                    ref={currentPasswordInput}
                    value={form.data.current_password}
                    onChange={(e) => form.setData('current_password', e.target.value)}
                    type="password"
                    autoComplete="current-password"
                />
                <InputError message={form.errors.current_password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                    id="password"
                    ref={passwordInput}
                    value={form.data.password}
                    onChange={(e) => form.setData('password', e.target.value)}
                    type="password"
                    autoComplete="new-password"
                />
                <InputError message={form.errors.password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                    id="password_confirmation"
                    value={form.data.password_confirmation}
                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                    type="password"
                    autoComplete="new-password"
                />
                <InputError message={form.errors.password_confirmation} />
            </div>

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
