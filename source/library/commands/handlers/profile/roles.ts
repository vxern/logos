import { getRoleCategories } from "logos:constants/roles";
import type { Client } from "logos/client";
import { RoleSelectionComponent } from "logos/commands/components/role-selection";

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
async function handleOpenRoleSelectionMenu(client: Client, interaction: Logos.Interaction): Promise<void> {
	const categories = getRoleCategories(constants.roles, interaction.guildId);
	const roleSelection = new RoleSelectionComponent(client, { interaction, categories });

	await roleSelection.display();
}

export { handleOpenRoleSelectionMenu };
