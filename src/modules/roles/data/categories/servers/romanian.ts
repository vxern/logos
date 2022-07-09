import { fromNames } from '../../../module.ts';
import { RoleCategory } from '../../structures/role-category.ts';

const categories: Partial<RoleCategory>[] = [
	{
		name: 'Ethnicities',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: fromNames(['Aromanian', 'Istro-Romanian', 'Megleno-Romanian']),
		},
	},
	{
		name: 'Branch',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: [],
		},
	},
	{
		name: 'Regions',
		collection: {
			type: 'COLLECTION_LOCALISED',
			list: fromNames([
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
];

export default categories;
