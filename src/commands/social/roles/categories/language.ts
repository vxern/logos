import { RoleCategory, RoleCategorySingle, RoleCollectionImplicit } from 'logos/src/commands/social/roles/types.ts';
import constants from 'logos/constants.ts';

const proficiency: RoleCategorySingle & { collection: RoleCollectionImplicit } = {
	type: 'single',
	id: 'roles.language.categories.proficiency',
	color: constants.colors.gray,
	emoji: constants.symbols.roles.categories.language.proficiency.category,
	minimum: 1,
	maximum: 1,
	collection: {
		type: 'implicit',
		list: [{
			id: 'roles.language.categories.proficiency.roles.beginner',
			emoji: constants.symbols.roles.categories.language.proficiency.beginner,
		}, {
			id: 'roles.language.categories.proficiency.roles.intermediate',
			emoji: constants.symbols.roles.categories.language.proficiency.intermediate,
		}, {
			id: 'roles.language.categories.proficiency.roles.advanced',
			emoji: constants.symbols.roles.categories.language.proficiency.advanced,
		}, {
			id: 'roles.language.categories.proficiency.roles.native',
			emoji: constants.symbols.roles.categories.language.proficiency.native,
		}],
	},
};

const category: RoleCategory = {
	type: 'group',
	id: 'roles.language',
	color: constants.colors.gray,
	emoji: constants.symbols.roles.categories.language.category,
	categories: [proficiency, {
		type: 'single',
		id: 'roles.language.categories.cefr',
		color: constants.colors.blue,
		emoji: constants.symbols.roles.categories.language.cefr.category,
		maximum: 1,
		collection: {
			type: 'implicit',
			list: [{
				id: 'roles.language.categories.cefr.roles.a0',
				emoji: constants.symbols.roles.categories.language.cefr.a0,
			}, {
				id: 'roles.language.categories.cefr.roles.a1',
				emoji: constants.symbols.roles.categories.language.cefr.a1,
			}, {
				id: 'roles.language.categories.cefr.roles.a2',
				emoji: constants.symbols.roles.categories.language.cefr.a2,
			}, {
				id: 'roles.language.categories.cefr.roles.b1',
				emoji: constants.symbols.roles.categories.language.cefr.b1,
			}, {
				id: 'roles.language.categories.cefr.roles.b2',
				emoji: constants.symbols.roles.categories.language.cefr.b2,
			}, {
				id: 'roles.language.categories.cefr.roles.c1',
				emoji: constants.symbols.roles.categories.language.cefr.c1,
			}, {
				id: 'roles.language.categories.cefr.roles.c2',
				emoji: constants.symbols.roles.categories.language.cefr.c2,
			}],
		},
	}],
};

export { proficiency };
export default category;
