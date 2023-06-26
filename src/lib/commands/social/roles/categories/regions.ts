import { RoleCategory } from 'logos/src/lib/commands/social/roles/types.ts';
import constants from 'logos/src/constants.ts';

const category: RoleCategory = {
	type: 'single',
	id: 'roles.regions',
	color: constants.colors.greenishLightGray,
	emoji: constants.symbols.roles.categories.regions.category,
	maximum: 2,
	collection: {
		type: 'custom',
		lists: {
			'910929726418350110': [
				{ id: 'roles.regions.languages.armenian.roles.aragatsotn', snowflake: '910929726485434390' },
				{ id: 'roles.regions.languages.armenian.roles.ararat', snowflake: '910929726485434389' },
				{ id: 'roles.regions.languages.armenian.roles.armavir', snowflake: '910929726418350119' },
				{ id: 'roles.regions.languages.armenian.roles.gegharkunik', snowflake: '910929726418350118' },
				{ id: 'roles.regions.languages.armenian.roles.kotayk', snowflake: '910929726418350117' },
				{ id: 'roles.regions.languages.armenian.roles.lorri', snowflake: '910929726418350116' },
				{ id: 'roles.regions.languages.armenian.roles.shirak', snowflake: '910929726418350115' },
				{ id: 'roles.regions.languages.armenian.roles.syunik', snowflake: '910929726418350114' },
				{ id: 'roles.regions.languages.armenian.roles.tavush', snowflake: '910929726418350113' },
				{ id: 'roles.regions.languages.armenian.roles.vayotsdzor', snowflake: '911049518110367814' },
				{ id: 'roles.regions.languages.armenian.roles.yerevan', snowflake: '911049617385332796' },
			],
			'432173040638623746': [
				{ id: 'roles.regions.languages.romanian.roles.banat', snowflake: '751155382428106814' },
				{ id: 'roles.regions.languages.romanian.roles.basarabia', snowflake: '828604051754844180' },
				{ id: 'roles.regions.languages.romanian.roles.bucovina', snowflake: '751155753846309035' },
				{ id: 'roles.regions.languages.romanian.roles.crisana', snowflake: '751155320272978111' },
				{ id: 'roles.regions.languages.romanian.roles.dobrogea', snowflake: '751157249262616598' },
				{ id: 'roles.regions.languages.romanian.roles.maramures', snowflake: '751156107229266101' },
				{ id: 'roles.regions.languages.romanian.roles.moldova', snowflake: '751155723836325908' },
				{ id: 'roles.regions.languages.romanian.roles.muntenia', snowflake: '751155609906446378' },
				{ id: 'roles.regions.languages.romanian.roles.oltenia', snowflake: '751155517199482892' },
				{ id: 'roles.regions.languages.romanian.roles.transilvania', snowflake: '751155021344669769' },
			],
		},
	},
};

export default category;
