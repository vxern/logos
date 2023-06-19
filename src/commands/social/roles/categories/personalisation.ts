import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/roles/roles.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	id: 'roles.personalisation',
	color: constants.colors.yellow,
	emoji: constants.symbols.roles.categories.personalisation.category,
	type: RoleCategoryTypes.CategoryGroup,
	categories: [
		{
			id: 'roles.personalisation.categories.orthography',
			type: RoleCategoryTypes.Category,
			color: constants.colors.husky,
			emoji: constants.symbols.roles.categories.personalisation.orthography.category,
			maximum: 1,
			collection: {
				type: RoleCollectionTypes.CollectionLocalised,
				lists: {
					'Romanian': [{
						id: 'roles.personalisation.categories.orthography.roles.idinist',
						emoji: constants.symbols.roles.categories.personalisation.orthography.idinist,
					}],
				},
			},
		},
		{
			id: 'roles.personalisation.categories.gender',
			type: RoleCategoryTypes.Category,
			color: constants.colors.orangeRed,
			emoji: constants.symbols.roles.categories.personalisation.gender.category,
			maximum: 1,
			collection: {
				type: RoleCollectionTypes.Collection,
				list: [{
					id: 'roles.personalisation.categories.gender.roles.male',
					emoji: constants.symbols.roles.categories.personalisation.gender.male,
				}, {
					id: 'roles.personalisation.categories.gender.roles.female',
					emoji: constants.symbols.roles.categories.personalisation.gender.female,
				}, {
					id: 'roles.personalisation.categories.gender.roles.transgender',
					emoji: constants.symbols.roles.categories.personalisation.gender.transgender,
				}, {
					id: 'roles.personalisation.categories.gender.roles.nonBinary',
					emoji: constants.symbols.roles.categories.personalisation.gender.nonbinary,
				}],
			},
		},
		{
			id: 'roles.personalisation.categories.abroad',
			type: RoleCategoryTypes.Category,
			color: constants.colors.husky,
			emoji: constants.symbols.roles.categories.personalisation.abroad.category,
			collection: {
				type: RoleCollectionTypes.Collection,
				list: [{
					id: 'roles.personalisation.categories.abroad.roles.diasporan',
					emoji: constants.symbols.roles.categories.personalisation.abroad.diasporan,
				}],
			},
		},
	],
};

export default category;
