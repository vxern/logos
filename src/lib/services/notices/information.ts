import { Client } from "logos/client";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const informationFields = constants.rules.map((rule, index) => {
			const strings = {
				title: this.client.localise(`rules.${rule}.title`, this.guildLocale)(),
				tldr: this.client.localise("rules.tldr", this.guildLocale)(),
				summary: this.client.localise(`rules.${rule}.summary`, this.guildLocale)(),
				content: this.client.localise(`rules.${rule}.content`, this.guildLocale)(),
			};

			return {
				name: `${constants.emojis.ruleBullet}  #${index + 1} ~ **${strings.title.toUpperCase()}**  ~  ${
					strings.tldr
				}: *${strings.summary}*`,
				value: strings.content,
				inline: false,
			};
		});

		const strings = constants.contexts.invite({ localise: this.client.localise, locale: this.guildLocale });
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
							value: `**${this.configuration.inviteLink}**`,
						},
					],
				},
			],
		};
	}
}

export { InformationNoticeService };
