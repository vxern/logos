import constants from "../../../../constants/constants";
import { Client } from "../../../client";
import { rules } from "../../../commands/moderation/commands/rule";
import { HashableMessageContents, NoticeService } from "../service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const informationFields = rules.map((rule, index) => {
			const strings = {
				title: this.client.localise(`rules.${rule}.title`, guildLocale)(),
				tldr: this.client.localise("rules.tldr", guildLocale)(),
				summary: this.client.localise(`rules.${rule}.summary`, guildLocale)(),
				content: this.client.localise(`rules.${rule}.content`, guildLocale)(),
			};

			return {
				name: `${constants.symbols.ruleBullet}  #${index + 1} ~ **${strings.title.toUpperCase()}**  ~  ${
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
					color: constants.colors.peach,
					fields: informationFields,
				},
				{
					color: constants.colors.gray,
					fields: [
						{
							name: `${constants.symbols.information.inviteLink}  ${strings.invite}`,
							value: `**${configuration.inviteLink}**`,
						},
					],
				},
			],
		};
	}
}

export { InformationNoticeService };
