import { Roles } from 'logos/assets/localisations/mod.ts';
import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/data/types.ts';
import constants from 'logos/constants.ts';

const categories: RoleCategory[] = [
	{
		...Roles.proficiency,
		type: RoleCategoryTypes.Category,
		color: constants.colors.black,
		emoji: '🎓',
		restrictToOneRole: true,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				...Roles.proficiency.roles.beginner,
				emoji: '🟩',
			}, {
				...Roles.proficiency.roles.intermediate,
				emoji: '🟦',
			}, {
				...Roles.proficiency.roles.advanced,
				emoji: '🟥',
			}, {
				...Roles.proficiency.roles.native,
				emoji: '🟨',
			}],
		},
	},
	{
		...Roles.personalisation,
		color: constants.colors.yellow,
		emoji: '🌈',
		type: RoleCategoryTypes.CategoryGroup,
		categories: [
			{
				...Roles.personalisation.categories.orthography,
				type: RoleCategoryTypes.Category,
				color: constants.colors.husky,
				emoji: '🖋️',
				restrictToOneRole: true,
				collection: {
					type: RoleCollectionTypes.CollectionLocalised,
					lists: {
						'Romanian': [{
							...Roles.personalisation.categories.orthography.roles.idinist,
							emoji: 'Idini',
						}],
					},
				},
			},
			{
				...Roles.personalisation.categories.gender,
				type: RoleCategoryTypes.Category,
				color: constants.colors.orangeRed,
				emoji: '⚧',
				restrictToOneRole: true,
				collection: {
					type: RoleCollectionTypes.Collection,
					list: [{
						...Roles.personalisation.categories.gender.roles.male,
						emoji: '♂️',
					}, {
						...Roles.personalisation.categories.gender.roles.female,
						emoji: '♀️',
					}, {
						...Roles.personalisation.categories.gender.roles.transgender,
						emoji: '⚧',
					}, {
						...Roles.personalisation.categories.gender.roles.nonBinary,
						emoji: '❔',
					}],
				},
			},
			{
				...Roles.personalisation.categories.abroad,
				type: RoleCategoryTypes.Category,
				color: constants.colors.husky,
				emoji: '🌎',
				restrictToOneRole: false,
				collection: {
					type: RoleCollectionTypes.Collection,
					list: [{
						...Roles.personalisation.categories.abroad.roles.diasporan,
						emoji: '🌎',
					}],
				},
			},
		],
	},
	{
		...Roles.learning,
		type: RoleCategoryTypes.Category,
		color: constants.colors.lightGray,
		emoji: '📖',
		restrictToOneRole: false,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				...Roles.learning.roles.classroomAttendee,
				emoji: '📖',
			}, {
				...Roles.learning.roles.correctMe,
				emoji: '✍️',
			}, {
				...Roles.learning.roles.dailyPhrase,
				emoji: '🌞',
			}, {
				...Roles.learning.roles.voicechatter,
				emoji: '🗣️',
			}],
		},
	},
	{
		...Roles.ethnicity,
		type: RoleCategoryTypes.Category,
		color: constants.colors.turquoise,
		emoji: '🗾',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			lists: {
				'Armenian': Roles.ethnicity.languages['Armenian'],
				'Romanian': Roles.ethnicity.languages['Romanian'],
			},
		},
	},
	{
		...Roles.dialects,
		type: RoleCategoryTypes.Category,
		color: constants.colors.green,
		emoji: '🏷️',
		restrictToOneRole: false,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			lists: {
				'Armenian': Roles.dialects.languages['Armenian'],
			},
		},
	},
	{
		...Roles.regions,
		type: RoleCategoryTypes.Category,
		color: constants.colors.greenishLightGray,
		emoji: '🤷‍♂️',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			lists: {
				'Armenian': Roles.regions.languages['Armenian'],
				'Belarusian': Roles.regions.languages['Belarusian'],
				'Romanian': Roles.regions.languages['Romanian'],
			},
		},
	},
];

export default categories;
