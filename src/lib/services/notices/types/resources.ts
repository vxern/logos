import { Client } from "../../../client";
import { HashableMessageContents, NoticeService } from "../service";

class ResourceNoticeService extends NoticeService<{ type: "resources" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "ResourceNoticeService", guildId }, { type: "resources" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		const configuration = this.configuration;
		if (configuration === undefined) {
			return;
		}

		const resourceConfiguration = guildDocument.resources;
		if (resourceConfiguration === undefined) {
			return;
		}

		const guildLocale = this.guildLocale;
		const featureLanguage = guildDocument.featureLanguage;

		const strings = {
			title: this.client.localise("notices.resources.title", guildLocale)(),
			description: {
				storedInRepository: this.client.localise(
					"notices.resources.description.storedInRepository",
					guildLocale,
				)({ link: resourceConfiguration.url }),
				easierToManage: this.client.localise("notices.resources.description.easierToManage", guildLocale)(),
				contributable: {
					contributable: this.client.localise("notices.resources.description.contributable", guildLocale)(),
					usingCommand: this.client.localise(
						"notices.resources.description.contributable.usingCommand",
						guildLocale,
					)({ command: "`/resource`" }),
					openingIssue: this.client.localise("notices.resources.description.contributable.openingIssue", guildLocale)(),
					pullRequest: this.client.localise(
						"notices.resources.description.contributable.makingPullRequest",
						guildLocale,
					)(),
				},
			},
			redirect: this.client.localise(
				"resources.strings.redirect",
				guildLocale,
			)({
				language: this.client.localise(constants.localisations.languages[featureLanguage], guildLocale)(),
			}),
		};

		return {
			embeds: [
				{
					title: strings.title,
					description:
						`${strings.description.storedInRepository}\n\n` +
						`${strings.description.easierToManage}\n\n` +
						`${strings.description.contributable.contributable}\n` +
						`1. ${strings.description.contributable.usingCommand}\n` +
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
							label: strings.redirect,
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
