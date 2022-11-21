import { localise } from 'logos/assets/localisations/mod.ts';
import { defaultLanguage } from 'logos/src/mod.ts';
import { praise, profile } from 'logos/src/commands/social/commands/mod.ts';
import {
	RoleCategory,
	RoleCategoryTypes,
	RoleCollection,
	RoleCollectionTypes,
} from 'logos/src/commands/social/data/structures/mod.ts';
import { roles } from 'logos/src/commands/social/data/mod.ts';

const commands = [
	praise,
	profile,
];

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
export default commands;
