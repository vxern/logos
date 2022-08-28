import praise from './commands/praise.ts';
import profile from './commands/profile.ts';
import global from './data/scopes/global.ts';
import local from './data/scopes/local.ts';
import {
	RoleCategory,
	RoleCategoryTypes,
} from './data/structures/role-category.ts';
import {
	RoleCollection,
	RoleCollectionTypes,
} from './data/structures/role-collection.ts';
import { Role } from './data/structures/role.ts';

const commands = [
	praise,
	profile,
];

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
 * @param roleCategories - The incomplete role categories.
 * @returns The completed categories.
 */
function supplyMissingProperties(
	roleCategories: RoleCategory[],
): RoleCategory[] {
	for (const category of roleCategories) {
		if (category.type === RoleCategoryTypes.CategoryGroup) {
			supplyMissingProperties(category.categories);
			continue;
		}

		const collection = category.collection;

		const roleLists =
			collection.type === RoleCollectionTypes.CollectionLocalised
				? Object.values<Role[]>(collection.lists)
				: [collection.list];

		for (const roleList of roleLists) {
			for (const role of roleList) {
				role.description ??= collection.description!(role.name);
				role.onAssignMessage ??= collection.onAssignMessage;
				if ('onUnassignMessage' in collection) {
					role.onUnassignMessage = collection.onUnassignMessage;
				}
			}
		}
	}

	return roleCategories;
}

type ProficiencyCategory = RoleCategory & {
	type: RoleCategoryTypes.Category;
	collection: RoleCollection & {
		type: RoleCollectionTypes.Collection;
	};
};

/**
 * Finds and returns the 'Proficiency' category.
 *
 * @returns The category with proficiency roles.
 */
function getProficiencyCategory(): ProficiencyCategory {
	return <ProficiencyCategory> roles.scopes
		.global.find((category) => category.name === 'Proficiency')!;
}

export { fromNames, getProficiencyCategory, roles };
export default commands;
