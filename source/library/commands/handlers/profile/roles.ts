import { getRoleCategories } from "logos:constants/roles";
import { Client } from "logos/client";
import { createRoleSelectionMenu } from "logos/commands/components/role-selection";

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
async function handleOpenRoleSelectionMenu(client: Client, interaction: Logos.Interaction): Promise<void> {
	const rootCategories = getRoleCategories(constants.roles, interaction.guildId);

	await createRoleSelectionMenu(client, interaction, {
		navigationData: {
			root: {
				type: "group",
				id: "roles.noCategory",
				color: constants.colours.invisible,
				emoji: constants.emojis.roles.noCategory,
				categories: rootCategories,
			},
			identifiersAccessed: [],
		},
		guildId: interaction.guildId,
	});
}

export { handleOpenRoleSelectionMenu };
