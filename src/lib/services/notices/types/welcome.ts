import constants from "../../../../constants.js";
import { MentionTypes, mention } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { HashableMessageContent, NoticeService } from "../service.js";
import * as Discord from "discordeno";

class WelcomeNoticeService extends NoticeService<"welcome"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "welcome" });
	}

	generateNotice(): HashableMessageContent | undefined {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const ruleChannelId = BigInt(configuration.ruleChannelId);

		const strings = {
			title: localise(this.client, "entry.welcome.title", defaultLocale)({ server_name: guild.name }),
			description: {
				toEnter: localise(
					this.client,
					"entry.welcome.description.toEnter",
					defaultLocale,
				)({ information_channel_mention: mention(ruleChannelId, MentionTypes.Channel) }),
				acceptedRules: localise(this.client, "entry.welcome.description.acceptedRules", defaultLocale)(),
			},
		};

		return {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toEnter,
					image: { url: constants.gifs.followRules },
					color: constants.colors.orange,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Secondary,
							label: strings.description.acceptedRules,
							customId: constants.staticComponentIds.entry.acceptedRules,
							emoji: { name: constants.symbols.understood },
						},
					],
				},
			],
		};
	}
}

export { WelcomeNoticeService };
