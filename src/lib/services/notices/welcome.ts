import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

class WelcomeNoticeService extends NoticeService<{ type: "welcome" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "WelcomeNoticeService", guildId }, { type: "welcome" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const ruleChannelId = BigInt(this.configuration.ruleChannelId);

		const guildLocale = this.guildLocale;
		const strings = {
			title: this.client.localise("entry.welcome.title", guildLocale)({ server_name: this.guild.name }),
			description: {
				toEnter: this.client.localise(
					"entry.welcome.description.toEnter",
					guildLocale,
				)({ information_channel_mention: mention(ruleChannelId, { type: "channel" }) }),
				acceptedRules: this.client.localise("entry.welcome.description.acceptedRules", guildLocale)(),
			},
		};

		return {
			embeds: [
				{
					title: strings.title,
					description: strings.description.toEnter,
					image: { url: constants.gifs.followRules },
					color: constants.colours.orange,
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
							emoji: { name: constants.emojis.understood },
						},
					],
				},
			],
		};
	}
}

export { WelcomeNoticeService };
