import { localise } from '../../../assets/localisations/mod.ts';
import { defaultLanguage } from '../../types.ts';
import { praise, profile } from './commands/mod.ts';
import { roles } from './data/mod.ts';
import { RoleCategory, RoleCategoryTypes, RoleCollection, RoleCollectionTypes } from './data/structures/mod.ts';

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
