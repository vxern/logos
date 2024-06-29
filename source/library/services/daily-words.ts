import { timeStructToMilliseconds } from "logos:constants/time.ts";
import type { Client } from "logos/client.ts";
import type { Guild } from "logos/models/guild.ts";
import { LocalService } from "logos/services/service.ts";

class DailyWordService extends LocalService {
	#postTimer?: globalThis.Timer;

	get #configuration(): NonNullable<Guild["dailyWords"]> {
		return this.guildDocument.dailyWords!;
	}

	get #postTime(): number {
		return (this.#configuration.time ?? constants.defaults.DAILY_WORD_TIME).reduce(
			(time, timeStruct) => time + timeStructToMilliseconds(timeStruct),
			0,
		);
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "DailyWordService", guildId });
	}

	async start(): Promise<void> {
		const delay = await this.#delayBeforeFirstPost();

		this.#postTimer = setTimeout(this.#postWord.bind(this), delay);
	}

	stop(): void {
		clearTimeout(this.#postTimer);
	}

	async #delayBeforeFirstPost(): Promise<number | undefined> {
		const lastMessageInChannel = await this.client.bot.helpers
			.getMessages(this.#configuration.channelId, { limit: 1 })
			.catch((reason) => {
				this.log.warn("Failed to get last message in daily word channel: ", reason);
				return undefined;
			})
			.then((messages) => messages?.at(0));
		if (lastMessageInChannel === undefined) {
			return undefined;
		}

		const lastPost = Discord.snowflakeToTimestamp(lastMessageInChannel.id);
		const timeSinceLastPost = Date.now() - lastPost;
		if (timeSinceLastPost >= constants.time.day) {
			return undefined;
		}

		return constants.time.day - timeSinceLastPost;
	}

	async #postWord(): Promise<void> {
		// TODO(vxern): Pick word to post.

		const tomorrow = new Date().setHours(0, 0, 0, 0) + constants.time.day + this.#postTime;
		this.#postTimer = setTimeout(this.#postWord.bind(this), tomorrow);
	}
}

export { DailyWordService };
