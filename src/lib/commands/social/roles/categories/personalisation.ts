import constants from "../../../../../constants/constants";
import { RoleCategory } from "../types";

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
							"1175841125546856608": "1175841125605572751",
							"1175841481089634476": "1175841481530036295",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.female",
						emoji: constants.symbols.roles.categories.personalisation.gender.female,
						snowflakes: {
							"910929726418350110": "910929726535774251",
							"432173040638623746": "907693786245759046",
							"1175841125546856608": "1175841125584609430",
							"1175841481089634476": "1175841481530036294",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.transgender",
						emoji: constants.symbols.roles.categories.personalisation.gender.transgender,
						snowflakes: {
							"910929726418350110": "910929726535774250",
							"432173040638623746": "907693818990718988",
							"1175841125546856608": "1175841125584609429",
							"1175841481089634476": "1175841481513246760",
						},
					},
					{
						id: "roles.personalisation.categories.gender.roles.nonBinary",
						emoji: constants.symbols.roles.categories.personalisation.gender.nonbinary,
						snowflakes: {
							"910929726418350110": "910929726535774249",
							"432173040638623746": "907693861327999097",
							"1175841125546856608": "1175841125584609428",
							"1175841481089634476": "1175841481513246759",
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
							"1175841125546856608": "1175841125584609426",
							"1175841481089634476": "1175841481513246757",
						},
					},
				],
			},
		},
	],
};

export default category;
