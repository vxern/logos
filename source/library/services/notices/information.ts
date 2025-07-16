import type { Client } from "logos/client";
import { type HashableMessageContents, NoticeService } from "logos/services/notices/service";
import { fromHex } from "logos:constants/colours";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });
	}

	generateNotice(): HashableMessageContents | undefined {
		return {
			embeds: [
				...constants.rules.map((rule, index) => {
					const strings = constants.contexts.rule({
						localise: this.client.localise,
						locale: this.guildLocale,
					});
					return {
						color: constants.colours.blue - fromHex("#090909") * index,
						title: `${index + 1} ・ ${strings.title(rule).toUpperCase()}: ${strings.summary(rule)}`,
						description: `> ${strings.content(rule)}`,
					};
				}),
				{
					color: constants.colours.blue - fromHex("#090909") * constants.rules.length,
				},
			],
		};
	}
}

export { InformationNoticeService };
