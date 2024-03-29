import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { handleOpenRoleSelectionMenu } from "logos/commands/handlers/profile/roles";
import { HashableMessageContents, NoticeService } from "logos/services/notices/service";

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
		this.#_selectRolesButton.onCollect(async (buttonPress) => {
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
		const guildLocale = this.guildLocale;
		const strings = {
			title: this.client.localise("roles.selection.title", guildLocale)(),
			description: {
				usingCommand: this.client.localise(
					"roles.selection.description.usingCommand",
					guildLocale,
				)({
					command: "`/profile roles`",
				}),
				runAnywhere: this.client.localise("roles.selection.description.runAnywhere", guildLocale)(),
				pressButton: this.client.localise("roles.selection.description.pressButton", guildLocale)(),
				clickHere: this.client.localise("roles.selection.description.clickHere", guildLocale)(),
			},
		};

		return {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.usingCommand} ${strings.description.runAnywhere}\n\n${strings.description.pressButton}`,
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
