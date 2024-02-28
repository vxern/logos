import { Client } from "../../client";
import { Guild } from "../../database/guild";
import diagnostics from "../../diagnostics";
import { LocalService } from "../service";
import { Events, MessageGenerators } from "./generator";
import generators from "./generators";

const messageGenerators: MessageGenerators<Events> = { ...generators.client, ...generators.guild };

class JournallingService extends LocalService {
	get configuration(): Guild["journalling"] {
		return this.guildDocument?.journalling;
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "JournallingService", guildId });
	}

	async start(): Promise<void> {}
	async stop(): Promise<void> {}

	// TODO(vxern): Rename to something else.
	async logEvent<Event extends keyof Events>(event: Event, { args }: { args: Events[Event] }): Promise<void> {
		const journalEntryGenerator = messageGenerators[event];
		if (journalEntryGenerator === undefined) {
			return;
		}

		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		if (!journalEntryGenerator.filter(this.client, this.guildId, ...args)) {
			return;
		}

		const journalEntry = await journalEntryGenerator.message(this.client, ...args);
		if (journalEntry === undefined) {
			return;
		}

		await this.client.bot.rest
			.sendMessage(channelId, {
				embeds: [
					{
						title: journalEntryGenerator.title,
						description: journalEntry,
						color: journalEntryGenerator.color,
					},
				],
			})
			.catch(() => this.log.warn(`Failed to log '${event}' event on ${diagnostics.display.guild(this.guildId)}.`));
	}

	async guildBanAdd(user: Discord.User, guildId: bigint): Promise<void> {
		this.logEvent("guildBanAdd", { args: [user, guildId] });
	}

	async guildBanRemove(user: Discord.User, guildId: bigint): Promise<void> {
		this.logEvent("guildBanRemove", { args: [user, guildId] });
	}

	async guildMemberAdd(member: Discord.Member, user: Discord.User): Promise<void> {
		this.logEvent("guildMemberAdd", { args: [member, user] });
	}

	async guildMemberRemove(user: Discord.User, guildId: bigint): Promise<void> {
		this.logEvent("guildMemberRemove", { args: [user, guildId] });
	}

	async messageDelete(
		payload: { id: bigint; channelId: bigint; guildId?: bigint | undefined },
		message?: Discord.Message | undefined,
	): Promise<void> {
		this.logEvent("messageDelete", { args: [payload, message] });
	}

	async messageUpdate(message: Discord.Message, oldMessage?: Discord.Message | undefined): Promise<void> {
		this.logEvent("messageUpdate", { args: [message, oldMessage] });
	}
}

export { JournallingService };
