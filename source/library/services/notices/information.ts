import type { Client } from "logos/client";
import { type HashableMessageContents, NoticeService } from "logos/services/notices/service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		return {
			embeds: [
				{
					color: constants.colours.blue,
					fields: constants.rules.map((rule, index) => {
						const strings = constants.contexts.rule({
							localise: this.client.localise,
							locale: this.guildLocale,
						});
						return {
							name: `${index + 1} ・ ${strings.title(rule).toUpperCase()} ・ ${strings.summary(rule)}`,
							value: strings.content(rule),
						};
					}),
				},
			],
		};
	}
}

export { InformationNoticeService };
