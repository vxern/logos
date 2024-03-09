import { RoleCategory, RoleCategorySingle, RoleCollectionImplicit } from "../types";

const proficiency: RoleCategorySingle & { collection: RoleCollectionImplicit } = {
	type: "single",
	id: "roles.language.categories.proficiency",
	color: constants.colours.gray,
	emoji: constants.emojis.roles.categories.language.proficiency.category,
	minimum: 1,
	maximum: 1,
	collection: {
		type: "implicit",
		list: [
			{
				id: "roles.language.categories.proficiency.roles.beginner",
				emoji: constants.emojis.roles.categories.language.proficiency.beginner,
				snowflakes: {
					"910929726418350110": "910929726535774253",
					"432173040638623746": "432204106615095307",
					"1175841125546856608": "1175841125630750727",
					"1175841481089634476": "1175841481550999661",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.intermediate",
				emoji: constants.emojis.roles.categories.language.proficiency.intermediate,
				snowflakes: {
					"910929726418350110": "910929726535774254",
					"432173040638623746": "432176435311149056",
					"1175841125546856608": "1175841125630750728",
					"1175841481089634476": "1175841481550999662",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.advanced",
				emoji: constants.emojis.roles.categories.language.proficiency.advanced,
				snowflakes: {
					"910929726418350110": "910929726535774255",
					"432173040638623746": "432176480269631502",
					"1175841125546856608": "1175841125630750729",
					"1175841481089634476": "1175841481571967097",
				},
			},
			{
				id: "roles.language.categories.proficiency.roles.native",
				emoji: constants.emojis.roles.categories.language.proficiency.native,
				snowflakes: {
					"910929726418350110": "910929726535774256",
					"432173040638623746": "432175772623437825",
					"1175841125546856608": "1175841125651718174",
					"1175841481089634476": "1175841481571967098",
				},
			},
		],
	},
};

const category: RoleCategory = {
	type: "group",
	id: "roles.language",
	color: constants.colours.gray,
	emoji: constants.emojis.roles.categories.language.category,
	categories: [
		proficiency,
		{
			type: "single",
			id: "roles.language.categories.cefr",
			color: constants.colours.blue,
			emoji: constants.emojis.roles.categories.language.cefr.category,
			maximum: 1,
			collection: {
				type: "implicit",
				list: [
					{
						id: "roles.language.categories.cefr.roles.a0",
						emoji: constants.emojis.roles.categories.language.cefr.a0,
						snowflakes: {
							"910929726418350110": "1095053872059400332",
							"432173040638623746": "1095052477100998676",
							"1175841125546856608": "1175841125630750725",
							"1175841481089634476": "1175841481550999659",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.a1",
						emoji: constants.emojis.roles.categories.language.cefr.a1,
						snowflakes: {
							"910929726418350110": "1095053893299347466",
							"432173040638623746": "1095052646441824408",
							"1175841125546856608": "1175841125630750724",
							"1175841481089634476": "1175841481550999658",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.a2",
						emoji: constants.emojis.roles.categories.language.cefr.a2,
						snowflakes: {
							"910929726418350110": "1095053911414554625",
							"432173040638623746": "1095052690033217577",
							"1175841125546856608": "1175841125630750723",
							"1175841481089634476": "1175841481550999657",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.b1",
						emoji: constants.emojis.roles.categories.language.cefr.b1,
						snowflakes: {
							"910929726418350110": "1095053921589923851",
							"432173040638623746": "1095052828340400148",
							"1175841125546856608": "1175841125630750722",
							"1175841481089634476": "1175841481550999656",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.b2",
						emoji: constants.emojis.roles.categories.language.cefr.b2,
						snowflakes: {
							"910929726418350110": "1095053935686991892",
							"432173040638623746": "1095052854739345460",
							"1175841125546856608": "1175841125630750721",
							"1175841481089634476": "1175841481550999655",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.c1",
						emoji: constants.emojis.roles.categories.language.cefr.c1,
						snowflakes: {
							"910929726418350110": "1095053946097242236",
							"432173040638623746": "1095052882979598427",
							"1175841125546856608": "1175841125630750720",
							"1175841481089634476": "1175841481550999654",
						},
					},
					{
						id: "roles.language.categories.cefr.roles.c2",
						emoji: constants.emojis.roles.categories.language.cefr.c2,
						snowflakes: {
							"910929726418350110": "1095053955207282808",
							"432173040638623746": "1095052905637224520",
							"1175841125546856608": "1175841125605572760",
							"1175841481089634476": "1175841481550999653",
						},
					},
				],
			},
		},
	],
};

export { proficiency };
export default category;
