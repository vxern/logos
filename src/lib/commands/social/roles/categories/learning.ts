import constants from "../../../../../constants/constants";
import { RoleCategory } from "../types";

const category: RoleCategory = {
	type: "single",
	id: "roles.learning",
	color: constants.colors.lightGray,
	emoji: constants.symbols.roles.categories.learning.category,
	collection: {
		type: "implicit",
		list: [
			{
				id: "roles.learning.roles.correctMe",
				emoji: constants.symbols.roles.categories.learning.correctMe,
				snowflakes: {
					"910929726418350110": "910929726485434397",
					"432173040638623746": "841405470337269761",
					"1175841125546856608": "1175841125605572758",
					"1175841481089634476": "1175841481530036302",
				},
			},
			{
				id: "roles.learning.roles.doNotCorrectMe",
				emoji: constants.symbols.roles.categories.learning.doNotCorrectMe,
				snowflakes: {
					"910929726418350110": "1183179255144796192",
					"432173040638623746": "1183178246112677969",
					"1175841125546856608": "1183367415824908319",
					"1175841481089634476": "1183367622507634698",
				},
			},
			{
				id: "roles.learning.roles.classroomAttendee",
				emoji: constants.symbols.roles.categories.learning.classroomAttendee,
				snowflakes: {
					"910929726418350110": "910929726485434394",
					"432173040638623746": "725653430848323584",
					"1175841125546856608": "1175841125605572756",
					"1175841481089634476": "1175841481530036300",
				},
			},
			{
				id: "roles.learning.roles.dailyPhrase",
				emoji: constants.symbols.roles.categories.learning.dailyPhrase,
				snowflakes: {
					"910929726418350110": "910929726485434396",
					"432173040638623746": "532177259574853632",
					"1175841125546856608": "1175841125605572755",
					"1175841481089634476": "1175841481530036299",
				},
			},
			{
				id: "roles.learning.roles.voicechatter",
				emoji: constants.symbols.roles.categories.learning.voicechatter,
				snowflakes: {
					"910929726418350110": "910929726485434395",
					"432173040638623746": "692489433232048189",
					"1175841125546856608": "1175841125605572757",
					"1175841481089634476": "1175841481530036301",
				},
			},
		],
	},
};

export default category;
