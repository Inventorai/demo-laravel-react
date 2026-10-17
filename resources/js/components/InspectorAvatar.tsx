import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const initialsFrom = (name?: string | null) =>
    (name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('') || '?';

export default function InspectorAvatar({
    name,
    avatar,
    initials,
    online = false,
}: {
    name?: string | null;
    avatar?: string | null;
    initials?: string | null;
    online?: boolean;
}) {
    return (
        <span className="relative inline-flex shrink-0">
            <Avatar className="size-6">
                {avatar ? <AvatarImage src={avatar} alt={name ?? ''} /> : null}
                <AvatarFallback className="text-[10px]">{initials || initialsFrom(name)}</AvatarFallback>
            </Avatar>
            {/* Outside Avatar, which clips its children with overflow-hidden. */}
            {online ? (
                <span
                    className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background"
                    title="Online"
                />
            ) : null}
        </span>
    );
}
