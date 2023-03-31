import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/data/types.ts';
import constants from 'logos/constants.ts';

const categories: RoleCategory[] = [
	{
		id: 'roles.proficiency',
		type: RoleCategoryTypes.Category,
		color: constants.colors.gray,
		emoji: constants.symbols.roles.categories.proficiency.category,
		minimum: 1,
		maximum: 1,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				id: 'roles.proficiency.roles.beginner',
				emoji: constants.symbols.roles.categories.proficiency.beginner,
			}, {
				id: 'roles.proficiency.roles.intermediate',
				emoji: constants.symbols.roles.categories.proficiency.intermediate,
			}, {
				id: 'roles.proficiency.roles.advanced',
				emoji: constants.symbols.roles.categories.proficiency.advanced,
			}, {
				id: 'roles.proficiency.roles.native',
				emoji: constants.symbols.roles.categories.proficiency.native,
			}],
		},
	},
	{
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
	},
	{
		id: 'roles.learning',
		type: RoleCategoryTypes.Category,
		color: constants.colors.lightGray,
		emoji: constants.symbols.roles.categories.learning.category,
		collection: {
			type: RoleCollectionTypes.Collection,
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
	},
	{
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
	},
	{
		id: 'roles.dialects',
		type: RoleCategoryTypes.Category,
		color: constants.colors.green,
		emoji: constants.symbols.roles.categories.dialects.category,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			lists: {
				'Armenian': [
					{ id: 'roles.ethnicity.languages.armenian.roles.western' },
					{ id: 'roles.ethnicity.languages.armenian.roles.eastern' },
					{ id: 'roles.ethnicity.languages.armenian.roles.karabakh' },
				],
			},
		},
	},
	{
		id: 'roles.regions',
		type: RoleCategoryTypes.Category,
		color: constants.colors.greenishLightGray,
		emoji: constants.symbols.roles.categories.regions.category,
		maximum: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			lists: {
				'Armenian': [
					{ id: 'roles.regions.languages.armenian.roles.aragatsotn' },
					{ id: 'roles.regions.languages.armenian.roles.ararat' },
					{ id: 'roles.regions.languages.armenian.roles.armavir' },
					{ id: 'roles.regions.languages.armenian.roles.gegharkunik' },
					{ id: 'roles.regions.languages.armenian.roles.kotayk' },
					{ id: 'roles.regions.languages.armenian.roles.lorri' },
					{ id: 'roles.regions.languages.armenian.roles.shirak' },
					{ id: 'roles.regions.languages.armenian.roles.syunik' },
					{ id: 'roles.regions.languages.armenian.roles.tavush' },
					{ id: 'roles.regions.languages.armenian.roles.vayotsDzor' },
					{ id: 'roles.regions.languages.armenian.roles.yerevan' },
				],
				'Romanian': [
					{ id: 'roles.regions.languages.romanian.roles.banat' },
					{ id: 'roles.regions.languages.romanian.roles.basarabia' },
					{ id: 'roles.regions.languages.romanian.roles.bucovina' },
					{ id: 'roles.regions.languages.romanian.roles.crisana' },
					{ id: 'roles.regions.languages.romanian.roles.dobrogea' },
					{ id: 'roles.regions.languages.romanian.roles.maramures' },
					{ id: 'roles.regions.languages.romanian.roles.moldova' },
					{ id: 'roles.regions.languages.romanian.roles.muntenia' },
					{ id: 'roles.regions.languages.romanian.roles.oltenia' },
					{ id: 'roles.regions.languages.romanian.roles.transilvania' },
				],
			},
		},
	},
];

export default categories;
