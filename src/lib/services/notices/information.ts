import { Client } from "logos/client";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const informationFields = constants.rules.map((rule, index) => {
			const strings = {
				title: this.client.localise(`rules.${rule}.title`, guildLocale)(),
				tldr: this.client.localise("rules.tldr", guildLocale)(),
				summary: this.client.localise(`rules.${rule}.summary`, guildLocale)(),
				content: this.client.localise(`rules.${rule}.content`, guildLocale)(),
			};

			return {
				name: `${constants.emojis.ruleBullet}  #${index + 1} ~ **${strings.title.toUpperCase()}**  ~  ${
					strings.tldr
				}: *${strings.summary}*`,
				value: strings.content,
				inline: false,
			};
		});

		const strings = {
			invite: this.client.localise("notices.notices.information.invite", guildLocale)(),
		};

		return {
			embeds: [
				{
					color: constants.colours.blue,
					fields: informationFields,
				},
				{
					color: constants.colours.gray,
					fields: [
						{
							name: `${constants.emojis.information.inviteLink}  ${strings.invite}`,
							value: `**${configuration.inviteLink}**`,
						},
					],
				},
			],
		};
	}
}

export { InformationNoticeService };
