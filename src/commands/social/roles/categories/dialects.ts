import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/roles/roles.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	id: 'roles.dialects',
	type: RoleCategoryTypes.Category,
	color: constants.colors.green,
	emoji: constants.symbols.roles.categories.dialects.category,
	collection: {
		type: RoleCollectionTypes.CollectionLocalised,
		lists: {
			'Armenian': [
				{ id: 'roles.dialects.languages.armenian.roles.western' },
				{ id: 'roles.dialects.languages.armenian.roles.eastern' },
				{ id: 'roles.dialects.languages.armenian.roles.karabakh' },
			],
		},
	},
};

export default category;
