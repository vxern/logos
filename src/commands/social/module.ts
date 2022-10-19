import { localise } from '../../../assets/localisations/types.ts';
import { defaultLanguage } from '../../types.ts';
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
	return <ProficiencyCategory> roles.find((category) =>
		localise(category.name, defaultLanguage) === 'Proficiency'
	)!;
}

export { getProficiencyCategory };
export default commands;
