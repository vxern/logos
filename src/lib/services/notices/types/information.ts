import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Client, localise } from "../../../client";
import { rules } from "../../../commands/moderation/commands/rule";
import { HashableMessageContents, NoticeService } from "../service";

class InformationNoticeService extends NoticeService<"information"> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "information" });
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
		const informationFields = rules.map((rule, index) => {
			const strings = {
				title: localise(this.client, `rules.${rule}.title`, guildLocale)(),
				tldr: localise(this.client, "rules.tldr", guildLocale)(),
				summary: localise(this.client, `rules.${rule}.summary`, guildLocale)(),
				content: localise(this.client, `rules.${rule}.content`, guildLocale)(),
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
