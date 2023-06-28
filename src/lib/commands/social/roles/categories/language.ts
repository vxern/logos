import { RoleCategory, RoleCategorySingle, RoleCollectionImplicit } from "../types.js";
import constants from "../../../../../constants.js";

const proficiency: RoleCategorySingle & { collection: RoleCollectionImplicit } = {
	type: "single",
	id: "roles.language.categories.proficiency",
	color: constants.colors.gray,
	emoji: constants.symbols.roles.categories.language.proficiency.category,
	minimum: 1,
	maximum: 1,
	collection: {
		type: "implicit",
		list: [
			{
				id: "roles.language.categories.proficiency.roles.beginner",
				emoji: constants.symbols.roles.categories.language.proficiency.beginner,
				snowflakes: {
					"910929726418350110": "910929726535774253",
					"432173040638623746": "432204106615095307",
					"1055102122137489418": "1055102122158477380",
					"1055102910658269224": "1055102910687625252",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.intermediate",
				emoji: constants.symbols.roles.categories.language.proficiency.intermediate,
				snowflakes: {
					"910929726418350110": "910929726535774254",
					"432173040638623746": "432176435311149056",
					"1055102122137489418": "1055102122158477381",
					"1055102910658269224": "1055102910687625253",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.advanced",
				emoji: constants.symbols.roles.categories.language.proficiency.advanced,
				snowflakes: {
					"910929726418350110": "910929726535774255",
					"432173040638623746": "432176480269631502",
					"1055102122137489418": "1055102122158477382",
					"1055102910658269224": "1055102910687625254",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.native",
				emoji: constants.symbols.roles.categories.language.proficiency.native,
				snowflakes: {
					"910929726418350110": "910929726535774256",
					"432173040638623746": "432175772623437825",
					"1055102122137489418": "1055102122158477383",
					"1055102910658269224": "1055102910687625255",
				},
			},
		],
	},
};

const category: RoleCategory = {
	type: "group",
	id: "roles.language",
	color: constants.colors.gray,
	emoji: constants.symbols.roles.categories.language.category,
	categories: [
		proficiency,
		{
			type: "single",
			id: "roles.language.categories.cefr",
			color: constants.colors.blue,
			emoji: constants.symbols.roles.categories.language.cefr.category,
			maximum: 1,
			collection: {
				type: "implicit",
				list: [
					{
						id: "roles.language.categories.cefr.roles.a0",
						emoji: constants.symbols.roles.categories.language.cefr.a0,
						snowflakes: {
							"910929726418350110": "1095053872059400332",
							"432173040638623746": "1095052477100998676",
							"1055102122137489418": "1120466707107033138",
							"1055102910658269224": "1095057365365161994",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.a1",
						emoji: constants.symbols.roles.categories.language.cefr.a1,
						snowflakes: {
							"910929726418350110": "1095053893299347466",
							"432173040638623746": "1095052646441824408",
							"1055102122137489418": "1120466719459258438",
							"1055102910658269224": "1095057380561129543",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.a2",
						emoji: constants.symbols.roles.categories.language.cefr.a2,
						snowflakes: {
							"910929726418350110": "1095053911414554625",
							"432173040638623746": "1095052690033217577",
							"1055102122137489418": "1120466721992605806",
							"1055102910658269224": "1095057394276519976",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.b1",
						emoji: constants.symbols.roles.categories.language.cefr.b1,
						snowflakes: {
							"910929726418350110": "1095053921589923851",
							"432173040638623746": "1095052828340400148",
							"1055102122137489418": "1120466722659500235",
							"1055102910658269224": "1095057403206189157",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.b2",
						emoji: constants.symbols.roles.categories.language.cefr.b2,
						snowflakes: {
							"910929726418350110": "1095053935686991892",
							"432173040638623746": "1095052854739345460",
							"1055102122137489418": "1120466723963932795",
							"1055102910658269224": "1095057414396592169",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.c1",
						emoji: constants.symbols.roles.categories.language.cefr.c1,
						snowflakes: {
							"910929726418350110": "1095053946097242236",
							"432173040638623746": "1095052882979598427",
							"1055102122137489418": "1120466724886675507",
							"1055102910658269224": "1095057422017646653",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.c2",
						emoji: constants.symbols.roles.categories.language.cefr.c2,
						snowflakes: {
							"910929726418350110": "1095053955207282808",
							"432173040638623746": "1095052905637224520",
							"1055102122137489418": "1120466725897523280",
							"1055102910658269224": "1095057429072449636",
						},
					},
				],
			},
		},
	],
};

export { proficiency };
export default category;
