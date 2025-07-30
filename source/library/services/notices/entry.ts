import type { Client } from "rost/client";
import { type HashableMessageContents, NoticeService } from "rost/services/notices/service";

class EntryNoticeService extends NoticeService<{ type: "entry" }> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "EntryNoticeService", guildId }, { type: "entry" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const strings = constants.contexts.entryNotice({ localise: this.client.localise, locale: this.guildLocale });

		return {
			components: [
				{
					type: Discord.MessageComponentTypes.Container,
					components: [
						{
							type: Discord.MessageComponentTypes.MediaGallery,
							items: [{ media: { url: constants.media.images.banner } }],
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: Discord.SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.TextDisplay,
							content: `# ${strings.title({ server_name: this.guild.name })}`,
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: Discord.SeparatorSpacingSize.Large,
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

export { EntryNoticeService };
