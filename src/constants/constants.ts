import colors from "./types/colors.js";
import components from "./types/components.js";
import contributions from "./types/contributions.js";
import endpoints from "./types/endpoints.js";
import gifs from "./types/gifs.js";
import links from "./types/links.js";
import symbols from "./types/symbols.js";

export default {
	INTERACTION_TOKEN_EXPIRY: 1000 * 60 * 15 - 1000 * 10, // 14 minutes, 50 seconds.
	colors,
	components,
	contributions,
	endpoints,
	gifs,
	links,
	symbols,
};
