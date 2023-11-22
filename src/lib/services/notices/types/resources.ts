import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Client, localise } from "../../../client";
import { HashableMessageContents, NoticeService } from "../service";
import localisations from "../../../../constants/localisations";
import { getFeatureLanguage } from "../../../interactions";

class ResourceNoticeService extends NoticeService<"resources"> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "resources" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const guildLocale = this.guildLocale;
		const featureLanguage = getFeatureLanguage(this.guildDocument);

		const configuration = this.guildDocument?.features.language.features?.resources;
		if (configuration === undefined || !configuration.enabled) {
			return;
		}

		const strings = {
			title: localise(this.client, "notices.resources.title", guildLocale)(),
			description: {
				storedInRepository: localise(
					this.client,
					"notices.resources.description.storedInRepository",
					guildLocale,
				)({ link: configuration.url }),
				easierToManage: localise(this.client, "notices.resources.description.easierToManage", guildLocale)(),
				contributable: {
					contributable: localise(this.client, "notices.resources.description.contributable", guildLocale)(),
					usingCommand: localise(
						this.client,
						"notices.resources.description.contributable.usingCommand",
						guildLocale,
					)({ command: "`/resource`" }),
					openingIssue: localise(
						this.client,
						"notices.resources.description.contributable.openingIssue",
						guildLocale,
					)(),
					pullRequest: localise(
						this.client,
						"notices.resources.description.contributable.makingPullRequest",
						guildLocale,
					)(),
				},
			},
			redirect: localise(
				this.client,
				"resources.strings.redirect",
				guildLocale,
			)({
				language: localise(this.client, localisations.languages[featureLanguage], guildLocale)(),
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
					color: constants.colors.gray,
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
							url: configuration.url,
						},
					],
				},
			],
		};
	}
}

export { ResourceNoticeService };
