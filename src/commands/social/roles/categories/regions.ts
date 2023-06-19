import { RoleCategory, RoleCategoryTypes, RoleCollectionTypes } from 'logos/src/commands/social/roles/roles.ts';
import constants from 'logos/constants.ts';

const category: RoleCategory = {
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
				{ id: 'roles.regions.languages.armenian.roles.vayotsdzor' },
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
};

export default category;
