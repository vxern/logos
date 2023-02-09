import { Roles } from 'logos/assets/localisations/mod.ts';
import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/data/types.ts';
import constants from 'logos/constants.ts';

const categories: RoleCategory[] = [
	{
		...Roles.proficiency,
		type: RoleCategoryTypes.Category,
		color: constants.colors.gray,
		emoji: constants.symbols.roles.categories.proficiency.category,
		minimum: 1,
		maximum: 1,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				...Roles.proficiency.roles.beginner,
				emoji: constants.symbols.roles.categories.proficiency.beginner,
			}, {
				...Roles.proficiency.roles.intermediate,
				emoji: constants.symbols.roles.categories.proficiency.intermediate,
			}, {
				...Roles.proficiency.roles.advanced,
				emoji: constants.symbols.roles.categories.proficiency.advanced,
			}, {
				...Roles.proficiency.roles.native,
				emoji: constants.symbols.roles.categories.proficiency.native,
			}],
		},
	},
	{
		...Roles.personalisation,
		color: constants.colors.yellow,
		emoji: constants.symbols.roles.categories.personalisation.category,
		type: RoleCategoryTypes.CategoryGroup,
		categories: [
			{
				...Roles.personalisation.categories.orthography,
				type: RoleCategoryTypes.Category,
				color: constants.colors.husky,
				emoji: constants.symbols.roles.categories.personalisation.orthography.category,
				maximum: 1,
				collection: {
					type: RoleCollectionTypes.CollectionLocalised,
					lists: {
						'Romanian': [{
							...Roles.personalisation.categories.orthography.roles.idinist,
							emoji: constants.symbols.roles.categories.personalisation.orthography.idinist,
						}],
					},
				},
			},
			{
				...Roles.personalisation.categories.gender,
				type: RoleCategoryTypes.Category,
				color: constants.colors.orangeRed,
				emoji: constants.symbols.roles.categories.personalisation.gender.category,
				maximum: 1,
				collection: {
					type: RoleCollectionTypes.Collection,
					list: [{
						...Roles.personalisation.categories.gender.roles.male,
						emoji: constants.symbols.roles.categories.personalisation.gender.male,
					}, {
						...Roles.personalisation.categories.gender.roles.female,
						emoji: constants.symbols.roles.categories.personalisation.gender.female,
					}, {
						...Roles.personalisation.categories.gender.roles.transgender,
						emoji: constants.symbols.roles.categories.personalisation.gender.transgender,
					}, {
						...Roles.personalisation.categories.gender.roles.nonbinary,
						emoji: constants.symbols.roles.categories.personalisation.gender.nonbinary,
					}],
				},
			},
			{
				...Roles.personalisation.categories.abroad,
				type: RoleCategoryTypes.Category,
				color: constants.colors.husky,
				emoji: constants.symbols.roles.categories.personalisation.abroad.category,
				collection: {
					type: RoleCollectionTypes.Collection,
					list: [{
						...Roles.personalisation.categories.abroad.roles.diasporan,
						emoji: constants.symbols.roles.categories.personalisation.abroad.diasporan,
					}],
				},
			},
		],
	},
	{
		...Roles.learning,
		type: RoleCategoryTypes.Category,
		color: constants.colors.lightGray,
		emoji: constants.symbols.roles.categories.learning.category,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				...Roles.learning.roles.classroomAttendee,
				emoji: constants.symbols.roles.categories.learning.classroomAttendee,
			}, {
				...Roles.learning.roles.correctMe,
				emoji: constants.symbols.roles.categories.learning.correctMe,
			}, {
				...Roles.learning.roles.dailyPhrase,
				emoji: constants.symbols.roles.categories.learning.dailyPhrase,
			}, {
				...Roles.learning.roles.voicechatter,
				emoji: constants.symbols.roles.categories.learning.voicechatter,
			}],
		},
	},
	{
		...Roles.ethnicity,
		type: RoleCategoryTypes.Category,
		color: constants.colors.turquoise,
		emoji: constants.symbols.roles.categories.ethnicity.category,
		maximum: 2,
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
		emoji: constants.symbols.roles.categories.dialects.category,
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
		emoji: constants.symbols.roles.categories.regions.category,
		maximum: 2,
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
