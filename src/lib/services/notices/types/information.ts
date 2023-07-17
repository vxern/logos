import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { ruleIds } from "../../../commands/moderation/commands/rule.js";
import { HashableMessageContent, NoticeService } from "../service.js";

class InformationNoticeService extends NoticeService<"information"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "information" });
	}

	generateNotice(): HashableMessageContent | undefined {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const informationFields = ruleIds.map((ruleId, index) => {
			const strings = {
				title: localise(this.client, `rules.${ruleId}.title`, defaultLocale)(),
				tldr: localise(this.client, "rules.tldr", defaultLocale)(),
				summary: localise(this.client, `rules.${ruleId}.summary`, defaultLocale)(),
				content: localise(this.client, `rules.${ruleId}.content`, defaultLocale)(),
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
			invite: localise(this.client, "notices.notices.information.invite", defaultLocale)(),
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
