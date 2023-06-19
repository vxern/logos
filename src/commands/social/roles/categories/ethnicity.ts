import { RoleCategory } from 'logos/src/commands/social/roles/types.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	type: 'single',
	id: 'roles.ethnicity',
	color: constants.colors.turquoise,
	emoji: constants.symbols.roles.categories.ethnicity.category,
	maximum: 2,
	collection: {
		type: 'custom',
		lists: {
			'910929726418350110': [
				{ id: 'roles.ethnicity.languages.armenian.roles.armenoTat' },
				{ id: 'roles.ethnicity.languages.armenian.roles.circassian' },
				{ id: 'roles.ethnicity.languages.armenian.roles.hemshin' },
				{ id: 'roles.ethnicity.languages.armenian.roles.cryptoArmenian' },
			],
			'432173040638623746': [
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
