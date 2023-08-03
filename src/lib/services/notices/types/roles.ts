import constants from "../../../../constants/constants";
import defaults from "../../../../defaults";
import { Client, localise } from "../../../client";
import { handleOpenRoleSelectionMenu } from "../../../commands/social/commands/profile/roles";
import { decodeId } from "../../../interactions";
import { HashableMessageContents, NoticeService } from "../service";
import * as Discord from "discordeno";

class RoleNoticeService extends NoticeService<"roles"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "roles" });
	}

	generateNotice(): HashableMessageContents | undefined {
		const strings = {
			title: localise(this.client, "roles.selection.title", defaults.LOCALISATION_LOCALE)(),
			description: {
				usingCommand: localise(
					this.client,
					"roles.selection.description.usingCommand",
					defaults.LOCALISATION_LOCALE,
				)({
					command: "`/profile roles`",
				}),
				runAnywhere: localise(this.client, "roles.selection.description.runAnywhere", defaults.LOCALISATION_LOCALE)(),
				pressButton: localise(this.client, "roles.selection.description.pressButton", defaults.LOCALISATION_LOCALE)(),
				clickHere: localise(this.client, "roles.selection.description.clickHere", defaults.LOCALISATION_LOCALE)(),
			},
		};

		return {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.usingCommand} ${strings.description.runAnywhere}\n\n${strings.description.pressButton}`,
					color: constants.colors.turquoise,
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

	async interactionCreate(bot: Discord.Bot, interaction: Discord.Interaction): Promise<void> {
		if (interaction.type !== Discord.InteractionTypes.MessageComponent) {
			return;
		}

		const customId = interaction.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, ..._] = decodeId(customId);
		if (id !== constants.components.selectRoles) {
			return;
		}

		handleOpenRoleSelectionMenu([this.client, bot], interaction);
	}
}

export { RoleNoticeService };
