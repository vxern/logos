import roles from 'logos/src/commands/social/data/roles.ts';
import {
	isCategoryGroup,
	isLocalised,
	isStandalone,
	Role,
	RoleCategory,
	RoleCategoryTypes,
	RoleCollection,
	RoleCollectionTypes,
} from 'logos/src/commands/social/data/types.ts';
import { Language } from 'logos/types.ts';

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
	return roles.find((category) => category.id === 'roles.proficiency')! as ProficiencyCategory;
}

function getRelevantCategories(categories: RoleCategory[], language: Language | undefined): [RoleCategory, number][] {
	const selectedRoleCategories: [RoleCategory, number][] = [];

	for (let index = 0; index < categories.length; index++) {
		const category = categories.at(index)!;

		if (isCategoryGroup(category)) {
			selectedRoleCategories.push([category, index]);
			continue;
		}

		if (isLocalised(category.collection)) {
			if (language === undefined) continue;
			if (!(language in category.collection.lists)) continue;
		}

		selectedRoleCategories.push([category, index]);
	}

	return selectedRoleCategories;
}

/**
 * Extracts the list of roles from within a role collection and returns it.
 *
 * @param collection - The collection from which to read the list of roles.
 * @param language - The language concerning the guild.
 * @returns The list of roles within the collection.
 */
function resolveRoles(collection: RoleCollection, language: Language | undefined): Role[] {
	if (isStandalone(collection)) {
		return collection.list;
	}

	if (language === undefined) return [];

	return collection.lists[language] ?? [];
}

export { getProficiencyCategory, getRelevantCategories, resolveRoles };
