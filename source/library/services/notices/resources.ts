import { code } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { type HashableMessageContents, NoticeService } from "logos/services/notices/service";

class ResourceNoticeService extends NoticeService<{ type: "resources" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "ResourceNoticeService", guildId }, { type: "resources" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const resourceConfiguration = this.guildDocument.feature("resources");
		if (resourceConfiguration === undefined) {
			return;
		}

		const strings = {
			...constants.contexts.resourceNotice({ localise: this.client.localise, locale: this.guildLocale }),
			...constants.contexts.language({ localise: this.client.localise, locale: this.guildLocale }),
		};
		return {
			embeds: [
				{
					title: strings.title({ language: strings.language(this.guildDocument.languages.feature) }),
					description:
						`${strings.description.storedInRepository({ link: resourceConfiguration.url })}\n\n` +
						`${strings.description.easierToManage}\n\n` +
						`${strings.description.contributable.contributable}\n` +
						`1. ${strings.description.contributable.usingCommand({
							command: code(this.client.localiseCommand("resource", this.guildLocale)),
						})}\n` +
						`2. ${strings.description.contributable.openingIssue}\n` +
						`3. ${strings.description.contributable.pullRequest}\n`,
					color: constants.colours.blue,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							label: strings.redirect({
								language: strings.language(this.guildDocument.languages.feature),
							}),
							style: Discord.ButtonStyles.Link,
							url: resourceConfiguration.url,
						},
					],
				},
			],
		};
	}
}

export { ResourceNoticeService };
