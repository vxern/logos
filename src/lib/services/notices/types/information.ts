import constants from "../../../../constants/constants";
import { Client, localise } from "../../../client";
import { ruleIds } from "../../../commands/moderation/commands/rule";
import { HashableMessageContents, NoticeService } from "../service";

class InformationNoticeService extends NoticeService<"information"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const informationFields = ruleIds.map((ruleId, index) => {
			const strings = {
				title: localise(this.client, `rules.${ruleId}.title`, guildLocale)(),
				tldr: localise(this.client, "rules.tldr", guildLocale)(),
				summary: localise(this.client, `rules.${ruleId}.summary`, guildLocale)(),
				content: localise(this.client, `rules.${ruleId}.content`, guildLocale)(),
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
			invite: localise(this.client, "notices.notices.information.invite", guildLocale)(),
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
