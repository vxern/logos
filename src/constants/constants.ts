import colors from "./types/colors";
import components from "./types/components";
import contributions from "./types/contributions";
import endpoints from "./types/endpoints";
import gifs from "./types/gifs";
import links from "./types/links";
import symbols from "./types/symbols";

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
