import { localise } from 'logos/assets/localisations/mod.ts';
import { RoleCategory, RoleCategoryTypes } from 'logos/src/commands/social/data/structures/role-category.ts';
import { RoleCollection, RoleCollectionTypes } from 'logos/src/commands/social/data/structures/role-collection.ts';
import roles from 'logos/src/commands/social/data/roles.ts';
import { defaultLanguage } from 'logos/types.ts';

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
	return <ProficiencyCategory> roles.find((category) => localise(category.name, defaultLanguage) === 'Proficiency')!;
}

export { getProficiencyCategory };
