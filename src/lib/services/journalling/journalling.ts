import { Guild } from "../../database/structs/guild";
import { LocalService } from "../service";
import { Events, MessageGenerators } from "./generator";
import generators from "./generators";
import * as Discord from "discordeno";

const messageGenerators: MessageGenerators<Events> = { ...generators.client, ...generators.guild };

type Configuration = NonNullable<Guild["features"]["information"]["features"]>["journaling"];

class JournallingService extends LocalService {
	get configuration(): Configuration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.information.features?.journaling;
	}

	get channelId(): bigint | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return undefined;
		}

		return channelId;
	}

	async log<Event extends keyof Events>(
		bot: Discord.Bot,
		event: Event,
		{ args }: { args: Events[Event] },
	): Promise<void> {
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

		await Discord.sendMessage(bot, channelId, {
			embeds: [
				{
					title: journalEntryGenerator.title,
					description: journalEntry,
					color: journalEntryGenerator.color,
				},
			],
		}).catch(() => this.client.log.warn(`Failed to log '${event}' event on guild with ID ${this.guildId}.`));
	}

	async guildBanAdd(bot: Discord.Bot, user: Discord.User, guildId: bigint): Promise<void> {
		this.log(bot, "guildBanAdd", { args: [bot, user, guildId] });
	}

	async guildBanRemove(bot: Discord.Bot, user: Discord.User, guildId: bigint): Promise<void> {
		this.log(bot, "guildBanRemove", { args: [bot, user, guildId] });
	}

	async guildMemberAdd(bot: Discord.Bot, member: Discord.Member, user: Discord.User): Promise<void> {
		this.log(bot, "guildMemberAdd", { args: [bot, member, user] });
	}

	async guildMemberRemove(bot: Discord.Bot, user: Discord.User, guildId: bigint): Promise<void> {
		this.log(bot, "guildMemberRemove", { args: [bot, user, guildId] });
	}

	async messageDelete(
		bot: Discord.Bot,
		payload: { id: bigint; channelId: bigint; guildId?: bigint | undefined },
		message?: Discord.Message | undefined,
	): Promise<void> {
		this.log(bot, "messageDelete", { args: [bot, payload, message] });
	}

	async messageUpdate(
		bot: Discord.Bot,
		message: Discord.Message,
		oldMessage?: Discord.Message | undefined,
	): Promise<void> {
		this.log(bot, "messageUpdate", { args: [bot, message, oldMessage] });
	}
}

export { JournallingService };
