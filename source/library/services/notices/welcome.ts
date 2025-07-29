import type { Client } from "rost/client";
import { type HashableMessageContents, NoticeService } from "rost/services/notices/service";
import { SeparatorSpacingSize } from "@discordeno/bot";

// TODO(vxern): Rename to `EntryNoticeService`
class WelcomeNoticeService extends NoticeService<{ type: "welcome" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "WelcomeNoticeService", guildId }, { type: "welcome" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const strings = constants.contexts.welcomeNotice({ localise: this.client.localise, locale: this.guildLocale });

		return {
			components: [
				{
					type: Discord.MessageComponentTypes.Container,
					components: [
						{
							type: Discord.MessageComponentTypes.MediaGallery,
							items: [
								{
									media: {
										// TODO(vxern): Don't hard-code this.
										url: "https://media.discordapp.net/attachments/1398666723111997512/1399849870885519473/Discord_Banner_Small.png?ex=688a7f49&is=68892dc9&hm=245755e4b969f025631a95589a05ca080a7141c8add5cf4b8f7abc80c3b4649a&=&format=webp&quality=lossless&width=2000&height=500",
									},
								},
							],
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.TextDisplay,
							content: `# ${strings.title({ server_name: this.guild.name })}`,
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.TextDisplay,
							content: constants.rules
								.map((rule, index) => {
									const strings = constants.contexts.rule({
										localise: this.client.localise,
										locale: this.guildLocale,
									});
									return `${index + 1}. ${strings.summary(rule)}\n  -# ${strings.content(rule)}`;
								})
								.join("\n"),
						},
						{
							type: Discord.MessageComponentTypes.ActionRow,
							components: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Success,
									label: strings.description.acceptedRules,
									customId: constants.components.acceptedRules,
								},
							],
						},
					],
				},
			],
		};
	}
}

export { WelcomeNoticeService };
