import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { handleOpenRoleSelectionMenu } from "../../../commands/social/commands/profile/roles";
import { decodeId, getLocaleData } from "../../../interactions";
import { HashableMessageContents, NoticeService } from "../service";

class RoleNoticeService extends NoticeService<"roles"> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "roles" });
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

	async interactionCreate(interactionRaw: Discord.Interaction): Promise<void> {
		if (interactionRaw.type !== Discord.InteractionTypes.MessageComponent) {
			return;
		}

		const customId = interactionRaw.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, ..._] = decodeId(customId);
		if (id !== constants.components.selectRoles) {
			return;
		}

		const localeData = await getLocaleData(this.client, interactionRaw);
		const interaction: Logos.Interaction = { ...interactionRaw, ...localeData };

		handleOpenRoleSelectionMenu(this.client, interaction);
	}
}

export { RoleNoticeService };
