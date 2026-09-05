import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({
    className,
}: {
    // Vue merged the parent's `class` onto the root element automatically;
    // React has no attribute fallthrough, so the class arrives as a prop.
    className?: string;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const form = useForm({
        password: '',
    });

    const deleteUser = () => {
        form.delete(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
            },
            onError: () => passwordInput.current?.focus(),
            onFinish: () => {
                form.reset();
            },
        });
    };

    const closeDialog = () => {
        setDialogOpen(false);
        form.clearErrors();
        form.reset();
    };

    return (
        <div className={className}>
            <p className="text-sm text-muted-foreground">
                Before deleting your account, please download any data or information that you wish to retain.
            </p>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mt-4">
                        Delete Account
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Once your account is deleted, all of its resources and data
                            will be permanently deleted. Please enter your password to
                            confirm you would like to permanently delete your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="delete-password" className="sr-only">Password</Label>
                        <Input
                            id="delete-password"
                            ref={passwordInput}
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            type="password"
                            placeholder="Password"
                            onKeyUp={(e) => {
                                if (e.key === 'Enter') {
                                    deleteUser();
                                }
                            }}
                        />
                        <InputError message={form.errors.password} />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                        {/* Vue's AlertDialogAction ran cn(buttonVariants(), class),
                            so tailwind-merge let these overrides replace the default
                            variant's colours. React's wraps the primitive in
                            <Button asChild>, which only concatenates the two class
                            lists, leaving bg-primary in place — so the destructive
                            variant is asked for explicitly alongside the overrides. */}
                        <AlertDialogAction
                            variant="destructive"
                            onClick={deleteUser}
                            disabled={form.processing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
