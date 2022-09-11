import praise from './commands/praise.ts';
import profile from './commands/profile.ts';
import roles from './data/roles.ts';
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

type ProficiencyCategory = RoleCategory & {
	type: RoleCategoryTypes.Category;
	collection: RoleCollection & { type: RoleCollectionTypes.Collection };
};

/**
 * Finds and returns the 'Proficiency' category.
 *
 * @returns The category with proficiency roles.
 */
function getProficiencyCategory(): ProficiencyCategory {
	return <ProficiencyCategory> roles.find((category) =>
		category.name === 'Proficiency'
	)!;
}

export { fromNames, getProficiencyCategory };
export default commands;
