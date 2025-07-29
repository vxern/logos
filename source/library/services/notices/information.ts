import type { Client } from "rost/client";
import { InteractionCollector } from "rost/collectors";
import { handleOpenRoleSelectionMenu } from "rost/commands/handlers/profile/roles";
import { handleMakeReport } from "rost/commands/handlers/report";
import { handleSubmitResource } from "rost/commands/handlers/resource";
import { handleMakeSuggestion } from "rost/commands/handlers/suggestion";
import { handleOpenTicket } from "rost/commands/handlers/ticket/open";
import { type HashableMessageContents, NoticeService } from "rost/services/notices/service";

class InformationNoticeService extends NoticeService<{ type: "information" }> {
	readonly #selectRolesButton: InteractionCollector;
	readonly #makeSuggestionButton: InteractionCollector;
	readonly #makeReportButton: InteractionCollector;
	readonly #submitResourceButton: InteractionCollector;
	readonly #openTicketButton: InteractionCollector;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "information" });

		this.#selectRolesButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.notices.selectRoles,
			isPermanent: true,
		});
		this.#makeSuggestionButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.notices.makeSuggestion,
			isPermanent: true,
		});
		this.#makeReportButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.notices.makeReport,
			isPermanent: true,
		});
		this.#submitResourceButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.notices.submitResource,
			isPermanent: true,
		});
		this.#openTicketButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.notices.openTicket,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#selectRolesButton.onInteraction(async (buttonPress) =>
			handleOpenRoleSelectionMenu(this.client, buttonPress),
		);
		this.#makeSuggestionButton.onInteraction(async (buttonPress) => handleMakeSuggestion(this.client, buttonPress));
		this.#makeReportButton.onInteraction(async (buttonPress) => handleMakeReport(this.client, buttonPress));
		this.#submitResourceButton.onInteraction(async (buttonPress) => handleSubmitResource(this.client, buttonPress));
		this.#openTicketButton.onInteraction(async (buttonPress) => handleOpenTicket(this.client, buttonPress));

		await this.client.registerInteractionCollector(this.#selectRolesButton);
		await this.client.registerInteractionCollector(this.#makeSuggestionButton);
		await this.client.registerInteractionCollector(this.#makeReportButton);
		await this.client.registerInteractionCollector(this.#submitResourceButton);
		await this.client.registerInteractionCollector(this.#openTicketButton);

		await super.start();
	}

	async stop(): Promise<void> {
		await this.#selectRolesButton.close();

		await super.stop();
	}

	generateNotice(): HashableMessageContents | undefined {
		const informationNoticeConfiguration = this.guildDocument.feature("informationNotices");
		if (informationNoticeConfiguration === undefined) {
			return;
		}

		const strings = constants.contexts.informationNotice({
			localise: this.client.localise,
			locale: this.guildLocale,
		});

		return {
			components: [
				{
					type: Discord.MessageComponentTypes.Container,
					accentColor: constants.colours.notice,
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
							spacing: Discord.SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.ActionRow,
							components: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Link,
									label: strings.sections.socials.buttons.website,
									url: informationNoticeConfiguration.urls.website,
									// TODO(vxern): Don't hard-code.
									emoji: { name: "LearnRomanian", id: 1399737159002357872n },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Link,
									label: strings.sections.socials.buttons.discord,
									url: informationNoticeConfiguration.urls.discord,
									// TODO(vxern): Don't hard-code.
									emoji: { name: "Discord", id: 1399736045452656824n },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Link,
									label: strings.sections.socials.buttons.instagram,
									url: informationNoticeConfiguration.urls.instagram,
									// TODO(vxern): Don't hard-code.
									emoji: { name: "Instagram", id: 1399735860479660032n },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Link,
									label: strings.sections.socials.buttons.github,
									// TODO(vxern): Wrong URL.
									url: informationNoticeConfiguration.urls.instagram,
									// TODO(vxern): Don't hard-code.
									emoji: { name: "GitHub", id: 1399738535816462336n },
								},
							],
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: Discord.SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.TextDisplay,
							content: `### 📜 ${strings.sections.guidelines.title}`,
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
							type: Discord.MessageComponentTypes.Separator,
							spacing: Discord.SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.ActionRow,
							components: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Link,
									label: strings.sections.learning.buttons.resources,
									url: informationNoticeConfiguration.urls.resources,
									emoji: { name: "📚" },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.sections.learning.buttons.resource,
									customId: this.#submitResourceButton.customId,
									emoji: { name: "📓" },
								},
							],
						},
						{
							type: Discord.MessageComponentTypes.Separator,
							spacing: Discord.SeparatorSpacingSize.Large,
						},
						{
							type: Discord.MessageComponentTypes.ActionRow,
							components: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.sections.selfServe.buttons.roles,
									customId: this.#selectRolesButton.customId,
									emoji: { name: "🔰" },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.sections.selfServe.buttons.suggestion,
									customId: this.#makeSuggestionButton.customId,
									emoji: { name: "🌿" },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.sections.selfServe.buttons.report,
									customId: this.#makeReportButton.customId,
									emoji: { name: "💢" },
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.sections.selfServe.buttons.ticket,
									customId: this.#openTicketButton.customId,
									emoji: { name: "🎫" },
								},
							],
						},
					],
				},
			],
		};
	}
}

export { InformationNoticeService };
