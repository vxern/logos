import dialects from "./categories/dialects.js";
import ethnicity from "./categories/ethnicity.js";
import language from "./categories/language.js";
import learning from "./categories/learning.js";
import personalisation from "./categories/personalisation.js";
import regions from "./categories/regions.js";
import { Role, RoleCategory, RoleCollection, isCustom, isGroup, isImplicit } from "./types.js";

const categories: RoleCategory[] = [language, learning, dialects, personalisation, regions, ethnicity];

function getRoleCategories(categories: RoleCategory[], guildId: bigint): [category: RoleCategory, index: number][] {
	const guildIdString = guildId.toString();

	const selectedRoleCategories: [category: RoleCategory, index: number][] = [];

	for (const index of Array(categories.length).keys()) {
		const category = categories.at(index);
		if (category === undefined) {
			continue;
		}

		if (isGroup(category)) {
			selectedRoleCategories.push([category, index]);
			continue;
		}

		if (isCustom(category.collection)) {
			if (!(guildIdString in category.collection.lists)) {
				continue;
			}
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
