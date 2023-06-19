import { RoleCategory } from 'logos/src/commands/social/roles/types.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	type: 'single',
	id: 'roles.dialects',
	color: constants.colors.green,
	emoji: constants.symbols.roles.categories.dialects.category,
	collection: {
		type: 'custom',
		lists: {
			'910929726418350110': [
				{ id: 'roles.dialects.languages.armenian.roles.western' },
				{ id: 'roles.dialects.languages.armenian.roles.eastern' },
				{ id: 'roles.dialects.languages.armenian.roles.karabakh' },
			],
		},
	},
};

export default category;
