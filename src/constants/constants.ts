import acknowledgements from "./acknowledgements";
import colors from "./colors";
import components from "./components";
import contributions from "./contributions";
import defaults from "./defaults";
import emojis from "./emojis";
import endpoints from "./endpoints";
import gifs from "./gifs";
import languages from "./languages";
import links from "./links";
import patterns from "./patterns";
import properties from "./properties";
import special from "./special";
import statuses from "./statuses";
import time from "./time";

export default {
	INTERACTION_TOKEN_EXPIRY: 1000 * 60 * 15 - 1000 * 10, // 14 minutes, 50 seconds in milliseconds.
	SLOWMODE_COLLISION_TIMEOUT: 1000 * 20, // 20 seconds in milliseconds.
	MAXIMUM_CORRECTION_MESSAGE_LENGTH: 3072,
	MAXIMUM_USERNAME_LENGTH: 32,
	acknowledgements,
	// TODO(vxern): Rename to 'colours'.
	colors,
	components,
	contributions,
	defaults,
	emojis,
	endpoints,
	gifs,
	languages,
	links,
	patterns,
	properties,
	special,
	statuses,
	time,
};
