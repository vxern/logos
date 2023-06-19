import { RoleCategory } from 'logos/src/commands/social/roles/types.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
	type: 'single',
	id: 'roles.learning',
	color: constants.colors.lightGray,
	emoji: constants.symbols.roles.categories.learning.category,
	collection: {
		type: 'implicit',
		list: [{
			id: 'roles.learning.roles.classroomAttendee',
			emoji: constants.symbols.roles.categories.learning.classroomAttendee,
		}, {
			id: 'roles.learning.roles.correctMe',
			emoji: constants.symbols.roles.categories.learning.correctMe,
		}, {
			id: 'roles.learning.roles.dailyPhrase',
			emoji: constants.symbols.roles.categories.learning.dailyPhrase,
		}, {
			id: 'roles.learning.roles.voicechatter',
			emoji: constants.symbols.roles.categories.learning.voicechatter,
		}],
	},
};

export default category;
