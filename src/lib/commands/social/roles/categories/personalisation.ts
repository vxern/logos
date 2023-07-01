import constants from "../../../../../constants.js";
import { RoleCategory } from "../types.js";

const category: RoleCategory = {
	type: "group",
	id: "roles.personalisation",
	color: constants.colors.yellow,
	emoji: constants.symbols.roles.categories.personalisation.category,
	categories: [
		{
			type: "single",
			id: "roles.personalisation.categories.orthography",
			color: constants.colors.husky,
			emoji: constants.symbols.roles.categories.personalisation.orthography.category,
			maximum: 1,
			collection: {
				type: "custom",
				lists: {
					"432173040638623746": [
						{
							id: "roles.personalisation.categories.orthography.roles.idinist",
							emoji: constants.symbols.roles.categories.personalisation.orthography.idinist,
							snowflake: "1017445191159906344",
						},
					],
				},
			},
		},
		{
			type: "single",
			id: "roles.personalisation.categories.gender",
			color: constants.colors.orangeRed,
			emoji: constants.symbols.roles.categories.personalisation.gender.category,
			maximum: 1,
			collection: {
				type: "implicit",
				list: [
					{
						id: "roles.personalisation.categories.gender.roles.male",
						emoji: constants.symbols.roles.categories.personalisation.gender.male,
						snowflakes: {
							"910929726418350110": "910929726535774252",
							"432173040638623746": "907693256882655312",
							"1055102122137489418": "1055102122158477377",
							"1055102910658269224": "1055102910687625249",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.female",
						emoji: constants.symbols.roles.categories.personalisation.gender.female,
						snowflakes: {
							"910929726418350110": "910929726535774251",
							"432173040638623746": "907693786245759046",
							"1055102122137489418": "1055102122158477376",
							"1055102910658269224": "1055102910687625248",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.transgender",
						emoji: constants.symbols.roles.categories.personalisation.gender.transgender,
						snowflakes: {
							"910929726418350110": "910929726535774250",
							"432173040638623746": "907693818990718988",
							"1055102122137489418": "1055102122158477375",
							"1055102910658269224": "1055102910687625247",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.nonBinary",
						emoji: constants.symbols.roles.categories.personalisation.gender.nonbinary,
						snowflakes: {
							"910929726418350110": "910929726535774249",
							"432173040638623746": "907693861327999097",
							"1055102122137489418": "1055102122158477374",
							"1055102910658269224": "1055102910687625246",
						},
					},
				],
			},
		},
		{
			type: "single",
			id: "roles.personalisation.categories.abroad",
			color: constants.colors.husky,
			emoji: constants.symbols.roles.categories.personalisation.abroad.category,
			collection: {
				type: "implicit",
				list: [
					{
						id: "roles.personalisation.categories.abroad.roles.diasporan",
						emoji: constants.symbols.roles.categories.personalisation.abroad.diasporan,
						snowflakes: {
							"910929726418350110": "910929726485434398",
							"432173040638623746": "773215783857815552",
							"1055102122137489418": "1055102122145874049",
							"1055102910658269224": "1055102910675030025",
						},
					},
				],
			},
		},
	],
};

export default category;
