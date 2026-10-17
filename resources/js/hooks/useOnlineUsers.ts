import { useEffect, useState } from 'react';
import { getEcho } from '@/lib/echo';

type Member = { id: string | number; observer?: boolean };

/**
 * Tracks which team members are online via the team's presence channel.
 *
 * Team-token connections (ours included) join as hidden observers with an
 * id like "team:…"; they are not people, so they are dropped. Ids are kept
 * as strings so they compare cleanly with inspector ids from the API.
 *
 * Returns an empty Set when Reverb is not configured or there is no team.
 */
export function useOnlineUsers(teamId?: string | null): Set<string> {
    const [online, setOnline] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !teamId) return;

        const channel = `team.${teamId}.presence`;

        echo.join(channel)
            .here((members: Member[]) => {
                setOnline(new Set(members.filter((m) => !m.observer).map((m) => String(m.id))));
            })
            .joining((member: Member) => {
                if (member.observer) return;
                setOnline((prev) => new Set(prev).add(String(member.id)));
            })
            .leaving((member: Member) => {
                setOnline((prev) => {
                    const next = new Set(prev);
                    next.delete(String(member.id));
                    return next;
                });
            });

        return () => {
            echo.leave(channel);
            setOnline(new Set());
        };
    }, [teamId]);

    return online;
}
