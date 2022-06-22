import { Command } from '../../commands/structs/command.ts';
import select from './commands/profile.ts';
import global from './data/categories/global.ts';
import local from './data/categories/local.ts';
import { RoleCategory } from './data/structures/role-category.ts';
import { RoleCollectionType } from './data/structures/role-collection.ts';
import { Role } from './data/structures/role.ts';

const commands: Record<string, Command> = {
	select,
};

const roles = {
	scopes: {
		global: supplyMissingProperties(global),
		local: supplyMissingProperties(local),
	},
};

/**
 * Taking an array of strings, converts them to role objects.
 *
 * @param names - The strings to convert.
 * @returns The names converted to roles.
 */
function fromNames(names: string[]): Role[] {
	return names.map((name) => {
		return { name: name };
	});
}

/**
 * Taking an array of categories with partial information filled in, completes
 * the necessary information, and returns the complete role categories.
 *
 * @param categories - The incomplete role categories.
 * @returns The completed categories.
 */
function supplyMissingProperties(categories: RoleCategory[]): RoleCategory[] {
	for (const category of categories) {
		// If the category has any subcategories, supply missing properties to them
		// as well.
		if (category.categories) {
			supplyMissingProperties(category.categories);
			continue;
		}

		const collection = category.collection!;

		for (
			const list of collection.type === RoleCollectionType.COLLECTION_LOCALISED
				? Object.values(collection.lists!)
				: [collection.list!]
		) {
			for (const role of list) {
				role.description ??= collection.description!(role.name);
				role.onAssignMessage ??= collection.onAssignMessage;
				role.onUnassignMessage ??= collection.onUnassignMessage;
			}
		}
	}

	return categories;
}

/**
 * Finds and returns the 'Proficiency' category.
 *
 * @returns The category with proficiency roles.
 */
function getProficiencyCategory(): RoleCategory {
	return roles.scopes.global.find((category) =>
		category.name === 'Proficiency'
	)!;
}

export { fromNames, getProficiencyCategory, roles };
export default commands;
