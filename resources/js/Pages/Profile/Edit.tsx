import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head } from '@inertiajs/react';

export default function Edit({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail?: boolean;
    status?: string;
}) {
    return (
        <>
            <Head title="Profile" />

            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Profile
                    </h2>
                }
            >
                <div className="py-12">
                    <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Update your account's profile information and email address.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UpdateProfileInformationForm
                                    mustVerifyEmail={mustVerifyEmail}
                                    status={status}
                                    className="max-w-xl"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Update Password</CardTitle>
                                <CardDescription>
                                    Ensure your account is using a long, random password to stay secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UpdatePasswordForm className="max-w-xl" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Delete Account</CardTitle>
                                <CardDescription>
                                    Once your account is deleted, all of its resources and data will be permanently deleted.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DeleteUserForm className="max-w-xl" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
