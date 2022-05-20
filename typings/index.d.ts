import Discord from 'discord.js';

export interface ClientEventExport<EventName extends keyof Discord.ClientEvents> {
    /** @todo */
    // enabled?: boolean;
    name: string;
    handler(
        discord_client: Discord.Client,
        ...args: Discord.ClientEvents[EventName],
    ): Promise<void>;
}
