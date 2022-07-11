import configuration from '../../../../../configuration.ts';
import { fromNames } from '../../../module.ts';
import { RoleCategory } from '../../structures/role-category.ts';

const categories: Partial<RoleCategory>[] = [
	{
		name: 'Ethnicities',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: fromNames([
				'Armeno-Tat',
				'Circassian',
				'Hemshen',
				'Hidden',
			]),
		},
	},
	{
		name: 'Dialect',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: fromNames(configuration.guilds.languages.armenian.dialects),
		},
	},
	{
		name: 'Regions',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: fromNames([
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
		},
	},
];

export default categories;
