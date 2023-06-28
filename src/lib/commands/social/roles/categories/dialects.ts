import { RoleCategory } from "../types.js";
import constants from "../../../../../constants.js";

const category: RoleCategory = {
	type: "single",
	id: "roles.dialects",
	color: constants.colors.green,
	emoji: constants.symbols.roles.categories.dialects.category,
	collection: {
		type: "custom",
		lists: {
			"910929726418350110": [
				{ id: "roles.dialects.languages.armenian.roles.western", snowflake: "982407478761381898" },
				{ id: "roles.dialects.languages.armenian.roles.eastern", snowflake: "982407372733579305" },
				{ id: "roles.dialects.languages.armenian.roles.karabakh", snowflake: "1041345453360423033" },
			],
		},
	},
};

export default category;
