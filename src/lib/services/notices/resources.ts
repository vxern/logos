import { code } from "logos:core/formatting";
import { Client } from "logos/client";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

class ResourceNoticeService extends NoticeService<{ type: "resources" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "ResourceNoticeService", guildId }, { type: "resources" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const resourceConfiguration = this.guildDocument.resources;
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
					title: strings.title,
					description:
						`${strings.description.storedInRepository({ link: resourceConfiguration.url })}\n\n` +
						`${strings.description.easierToManage}\n\n` +
						`${strings.description.contributable.contributable}\n` +
						`1. ${strings.description.contributable.usingCommand({
							command: code(this.client.localiseCommand("resource", this.guildLocale)),
						})}\n` +
						`2. ${strings.description.contributable.openingIssue}\n` +
						`3. ${strings.description.contributable.pullRequest}\n`,
					color: constants.colours.gray,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							label: strings.redirect({ language: strings.language(this.guildDocument.featureLanguage) }),
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
