export default function InputError({
    message,
    className = '',
    ...props
}: React.ComponentProps<'p'> & { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p {...props} className={`text-sm text-destructive ${className}`}>
            {message}
        </p>
    );
}
