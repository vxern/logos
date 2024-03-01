import constants from "../../../../constants/constants";
import { MentionTypes, mention } from "../../../../formatting";
import { Client } from "../../../client";
import { HashableMessageContents, NoticeService } from "../service";

class WelcomeNoticeService extends NoticeService<{ type: "welcome" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "WelcomeNoticeService", guildId }, { type: "welcome" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return undefined;
		}

		const ruleChannelId = BigInt(configuration.ruleChannelId);

		const guildLocale = this.guildLocale;
		const strings = {
			title: this.client.localise("entry.welcome.title", guildLocale)({ server_name: guild.name }),
			description: {
				toEnter: this.client.localise(
					"entry.welcome.description.toEnter",
					guildLocale,
				)({ information_channel_mention: mention(ruleChannelId, MentionTypes.Channel) }),
				acceptedRules: this.client.localise("entry.welcome.description.acceptedRules", guildLocale)(),
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
							customId: constants.components.acceptedRules,
							emoji: { name: constants.symbols.understood },
						},
					],
				},
			],
		};
	}
}

export { WelcomeNoticeService };
