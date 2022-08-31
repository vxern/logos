import { _ } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { fromHex } from '../../../../utils.ts';
import { fromNames } from '../../module.ts';
import {
	RoleCategory,
	RoleCategoryTypes,
} from '../structures/role-category.ts';
import { RoleCollectionTypes } from '../structures/role-collection.ts';

const categories: RoleCategory[] = [
	{
		name: 'Ethnicities',
		description: 'Roles identifying one\'s ethnicity.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#68d8d6'),
		emoji: '🗾',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `Your ethnicity is now ${name}.`,
			onUnassignMessage: (name) => `Your ethnicity is no longer ${name}.`,
			generateDescription: (name) => `I am of ${name} heritage.`,
			lists: {
				'Armenian': fromNames([
					'Armeno-Tat',
					'Circassian',
					'Hemshen',
					'Hidden',
				]),
				'Romanian': fromNames([
					'Aromanian',
					'Istro-Romanian',
					'Megleno-Romanian',
				]),
			},
		},
	},
	{
		name: 'Dialects',
		description:
			'Roles specifying which dialect of the language one is learning.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#00cc66'),
		emoji: '🏷️',
		restrictToOneRole: false,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `You are now learning ${name}.`,
			onUnassignMessage: (name) => `You are no longer learning ${name}.`,
			generateDescription: (name) => `I am learning ${name}.`,
			lists: {
				'Armenian': fromNames(
					configuration.guilds.languages['Armenian'].dialects,
				),
			},
		},
	},
	{
		name: 'Regions',
		description: 'Roles specifying which area of the country one is from.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#c5e0d8'),
		emoji: '🤷‍♂️',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `You are now from ${name}.`,
			onUnassignMessage: (name) => `You are no longer from ${name}.`,
			generateDescription: (name) => `I am from ${name}.`,
			lists: {
				'Armenian': fromNames([
					'Aragats\'otn / Արագածոտն',
					'Ararat / Արարատ',
					'Armavir / Արմավիր',
					'Geghark\'unik\' / Գեղարքունիք',
					'Kotayk\' / Կոտայք',
					'Lorri / Լոռի',
					'Shirak / Շիրակ',
					'Syunik\' / Սյունիք',
					'Tavush / Տավուշ',
					'Vayots\' Dzor / Վայոց Ձոր',
					'Yerevan / Երևան',
				]),
				'Belarusian': fromNames([
					'Brest / Брэсцкая',
					'Hrodna / Гродзенская',
					'Homel / Гомельская',
					'Mahilyow / Магілёўская',
					'Minsk / Мінская',
					'Vitsebsk / Вiцебская',
				]),
				'Romanian': fromNames([
					'Banat',
					'Basarabia',
					'Bucovina',
					'Crișana',
					'Dobrogea',
					'Maramureș',
					'Moldova',
					'Muntenia',
					'Oltenia',
					'Transilvania',
				]),
			},
		},
	},
];

export default categories;
