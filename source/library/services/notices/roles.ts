import { code } from "logos:core/formatting";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { handleOpenRoleSelectionMenu } from "logos/commands/handlers/profile/roles";
import { type HashableMessageContents, NoticeService } from "logos/services/notices/service";

class RoleNoticeService extends NoticeService<{ type: "roles" }> {
	readonly #_selectRolesButton: InteractionCollector;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "roles" });

		this.#_selectRolesButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.selectRoles,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#_selectRolesButton.onInteraction(async (buttonPress) => {
			await handleOpenRoleSelectionMenu(this.client, buttonPress);
		});

		await this.client.registerInteractionCollector(this.#_selectRolesButton);

		await super.start();
	}

	async stop(): Promise<void> {
		await this.#_selectRolesButton.close();

		await super.stop();
	}

	generateNotice(): HashableMessageContents | undefined {
		const strings = constants.contexts.howToSelectRoles({
			localise: this.client.localise.bind(this.client),
			locale: this.guildLocale,
		});

		return {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.usingCommand({
						command: code(this.client.localiseCommand("profile.options.roles", this.guildLocale)),
					})} ${strings.description.runAnywhere}\n\n${strings.description.pressButton}`,
					color: constants.colours.murrey,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							label: strings.description.clickHere,
							style: Discord.ButtonStyles.Primary,
							customId: this.#_selectRolesButton.customId,
						},
					],
				},
			],
		};
	}
}

export { RoleNoticeService };
