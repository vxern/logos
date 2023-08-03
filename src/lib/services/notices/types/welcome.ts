import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import { Client, localise } from "../../../client";
import { HashableMessageContents, NoticeService } from "../service";
import * as Discord from "discordeno";

class WelcomeNoticeService extends NoticeService<"welcome"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "welcome" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const ruleChannelId = BigInt(configuration.ruleChannelId);

		const strings = {
			title: localise(this.client, "entry.welcome.title", defaults.LOCALISATION_LOCALE)({ server_name: guild.name }),
			description: {
				toEnter: localise(
					this.client,
					"entry.welcome.description.toEnter",
					defaults.LOCALISATION_LOCALE,
				)({ information_channel_mention: mention(ruleChannelId, MentionTypes.Channel) }),
				acceptedRules: localise(this.client, "entry.welcome.description.acceptedRules", defaults.LOCALISATION_LOCALE)(),
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
							customId: constants.components.entry.acceptedRules,
							emoji: { name: constants.symbols.understood },
						},
					],
				},
			],
		};
	}
}

export { WelcomeNoticeService };
