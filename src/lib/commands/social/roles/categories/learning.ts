import { RoleCategory } from 'logos/src/lib/commands/social/roles/types.ts';
import constants from 'logos/src/constants.ts';

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
			snowflakes: {
				'910929726418350110': '910929726485434394',
				'432173040638623746': '725653430848323584',
				'1055102122137489418': '1055102122145874046',
				'1055102910658269224': '1055102910675030022',
			},
		}, {
			id: 'roles.learning.roles.correctMe',
			emoji: constants.symbols.roles.categories.learning.correctMe,
			snowflakes: {
				'910929726418350110': '910929726485434397',
				'432173040638623746': '841405470337269761',
				'1055102122137489418': '1055102122145874048',
				'1055102910658269224': '1055102910675030024',
			},
		}, {
			id: 'roles.learning.roles.dailyPhrase',
			emoji: constants.symbols.roles.categories.learning.dailyPhrase,
			snowflakes: {
				'910929726418350110': '910929726485434396',
				'432173040638623746': '532177259574853632',
				'1055102122137489418': '1055102122145874045',
				'1055102910658269224': '1055102910675030021',
			},
		}, {
			id: 'roles.learning.roles.voicechatter',
			emoji: constants.symbols.roles.categories.learning.voicechatter,
			snowflakes: {
				'910929726418350110': '910929726485434395',
				'432173040638623746': '692489433232048189',
				'1055102122137489418': '1055102122145874047',
				'1055102910658269224': '1055102910675030023',
			},
		}],
	},
};

export default category;
