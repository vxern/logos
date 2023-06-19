import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/roles/roles.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	id: 'roles.ethnicity',
	type: RoleCategoryTypes.Category,
	color: constants.colors.turquoise,
	emoji: constants.symbols.roles.categories.ethnicity.category,
	maximum: 2,
	collection: {
		type: RoleCollectionTypes.CollectionLocalised,
		lists: {
			'Armenian': [
				{ id: 'roles.ethnicity.languages.armenian.roles.armenoTat' },
				{ id: 'roles.ethnicity.languages.armenian.roles.circassian' },
				{ id: 'roles.ethnicity.languages.armenian.roles.hemshin' },
				{ id: 'roles.ethnicity.languages.armenian.roles.cryptoArmenian' },
			],
			'Romanian': [
				{ id: 'roles.ethnicity.languages.romanian.roles.aromanian' },
				{ id: 'roles.ethnicity.languages.romanian.roles.istroRomanian' },
				{ id: 'roles.ethnicity.languages.romanian.roles.meglenoRomanian' },
				{ id: 'roles.ethnicity.languages.romanian.roles.romani' },
				{ id: 'roles.ethnicity.languages.romanian.roles.hungarian' },
				{ id: 'roles.ethnicity.languages.romanian.roles.german' },
			],
		},
	},
};

export default category;
