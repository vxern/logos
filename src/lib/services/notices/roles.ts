import { Client } from "../../client";
import { InteractionCollector } from "../../collectors";
import { handleOpenRoleSelectionMenu } from "../../commands/social/commands/profile/roles";
import { HashableMessageContents, NoticeService } from "./service";

class RoleNoticeService extends NoticeService<{ type: "roles" }> {
	readonly #_selectRolesButton: InteractionCollector;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "InformationNoticeService", guildId }, { type: "roles" });

		this.#_selectRolesButton = new InteractionCollector(client, {
			customId: constants.components.selectRoles,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#_selectRolesButton.onCollect(async (buttonPress) => {
			await handleOpenRoleSelectionMenu(this.client, buttonPress);
		});

		await this.client.registerInteractionCollector(this.#_selectRolesButton);
	}

	async stop(): Promise<void> {
		await this.#_selectRolesButton.close();
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
					color: constants.colours.turquoise,
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
							customId: constants.components.selectRoles,
						},
					],
				},
			],
		};
	}
}

export { RoleNoticeService };
