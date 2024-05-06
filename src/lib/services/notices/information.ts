import { Client } from "logos/client";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const informationFields = constants.rules.map((rule, index) => {
			const strings = {
				...constants.contexts.tldr({
					localise: this.client.localise.bind(this.client),
					locale: this.guildLocale,
				}),
				...constants.contexts.rule({
					localise: this.client.localise.bind(this.client),
					locale: this.guildLocale,
				}),
			};
			return {
				name: `${constants.emojis.ruleBullet}  #${index + 1} ~ **${strings.title(rule).toUpperCase()}**  ~  ${
					strings.tldr
				}: *${strings.summary(rule)}*`,
				value: strings.content(rule),
				inline: false,
			};
		});

		const strings = constants.contexts.invite({
			localise: this.client.localise.bind(this.client),
			locale: this.guildLocale,
		});
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
