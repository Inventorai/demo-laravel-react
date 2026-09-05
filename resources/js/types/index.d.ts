import { Config } from 'ziggy-js';

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface ReverbConfig {
    key: string;
    host: string;
    port: number;
    scheme: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    ziggy: Config & { location: string };
    flash: {
        error?: string;
        success?: string;
    };
    reverb: ReverbConfig;
    team_id: string;
};
