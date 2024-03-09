import { RoleCategory } from "../types";

const category: RoleCategory = {
	type: "single",
	id: "roles.ethnicity",
	color: constants.colors.turquoise,
	emoji: constants.emojis.roles.categories.ethnicity.category,
	maximum: 2,
	collection: {
		type: "custom",
		lists: {
			"910929726418350110": [
				{ id: "roles.ethnicity.languages.armenian.roles.armenoTat", snowflake: "910929726485434393" },
				{ id: "roles.ethnicity.languages.armenian.roles.circassian", snowflake: "910929726485434392" },
				{ id: "roles.ethnicity.languages.armenian.roles.hemshin", snowflake: "910929726485434391" },
				{ id: "roles.ethnicity.languages.armenian.roles.cryptoArmenian", snowflake: "910929726418350112" },
			],
			"432173040638623746": [
				{ id: "roles.ethnicity.languages.romanian.roles.aromanian", snowflake: "778021019302101024" },
				{ id: "roles.ethnicity.languages.romanian.roles.istroRomanian", snowflake: "778020962482126858" },
				{ id: "roles.ethnicity.languages.romanian.roles.meglenoRomanian", snowflake: "778021019180859413" },
				{ id: "roles.ethnicity.languages.romanian.roles.romani", snowflake: "1055458867200393216" },
				{ id: "roles.ethnicity.languages.romanian.roles.hungarian", snowflake: "1055458896317255680" },
				{ id: "roles.ethnicity.languages.romanian.roles.german", snowflake: "1055458905792188518" },
			],
		},
	},
};

export default category;
