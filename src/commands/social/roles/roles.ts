import dialects from 'logos/src/commands/social/roles/categories/dialects.ts';
import ethnicity from 'logos/src/commands/social/roles/categories/ethnicity.ts';
import language from 'logos/src/commands/social/roles/categories/language.ts';
import learning from 'logos/src/commands/social/roles/categories/learning.ts';
import personalisation from 'logos/src/commands/social/roles/categories/personalisation.ts';
import regions from 'logos/src/commands/social/roles/categories/regions.ts';
import {
	isCustom,
	isGroup,
	isImplicit,
	Role,
	RoleCategory,
	RoleCollection,
} from 'logos/src/commands/social/roles/types.ts';

const categories: RoleCategory[] = [language, learning, dialects, personalisation, regions, ethnicity];

function getRoleCategories(categories: RoleCategory[], guildId: bigint): [category: RoleCategory, index: number][] {
	const guildIdString = guildId.toString();

	const selectedRoleCategories: [category: RoleCategory, index: number][] = [];

	for (const index of Array(categories.length).keys()) {
		const category = categories.at(index)!;

		if (isGroup(category)) {
			selectedRoleCategories.push([category, index]);
			continue;
		}

		if (isCustom(category.collection)) {
			if (!(guildIdString in category.collection.lists)) continue;
		}

		selectedRoleCategories.push([category, index]);
	}

	return selectedRoleCategories;
}

/** Extracts the list of roles from within a role collection and returns it. */
function getRoles(collection: RoleCollection, guildId: bigint): Role[] {
	if (isImplicit(collection)) {
		return collection.list;
	}

	const guildIdString = guildId.toString();

	return collection.lists[guildIdString] ?? [];
}

export { getRoleCategories, getRoles };
export default categories;
