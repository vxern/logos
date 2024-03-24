import { Role, RoleCategory, RoleCollection, isCustom, isGroup, isImplicit } from "logos/commands/social/roles/types";

function getRoleCategories(categories: Record<string, RoleCategory>, guildId: bigint): Record<string, RoleCategory> {
	const guildIdString = guildId.toString();

	const selectedRoleCategories: Record<string, RoleCategory> = {};

	for (const [name, category] of Object.entries(categories)) {
		if (isGroup(category)) {
			selectedRoleCategories[name] = category;
			continue;
		}

		if (isCustom(category.collection)) {
			if (!(guildIdString in category.collection.lists)) {
				continue;
			}
		}

		selectedRoleCategories[name] = category;
	}

	return selectedRoleCategories;
}

/** Extracts the list of roles from within a role collection and returns it. */
function getRoles(collection: RoleCollection, guildId: bigint): Record<string, Role> {
	if (isImplicit(collection)) {
		return collection.list;
	}

	const guildIdString = guildId.toString();

	return collection.lists[guildIdString] ?? {};
}

export { getRoleCategories, getRoles };
