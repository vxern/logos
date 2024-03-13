import acknowledgements from "./acknowledgements";
import colours from "./colours";
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
import licences from "./licences";
import localisations from "./localisations";

const constants = Object.freeze({
	PROJECT_NAME: "Logos",
	USER_AGENT: "Logos (https://github.com/vxern/logos)",
	MAXIMUM_DELETABLE_MESSAGES: 500,
	MAXIMUM_INDEXABLE_MESSAGES: 1000,
	MAXIMUM_CORRECTION_MESSAGE_LENGTH: 3072,
	MAXIMUM_USERNAME_LENGTH: 32,
	MAXIMUM_VOLUME: 100,
	MAXIMUM_HISTORY_ENTRIES: 100,
	MAXIMUM_QUEUE_ENTRIES: 100,
	RESULTS_PER_PAGE: 10,
	STATUS_CYCLE_PERIOD: 1000 * 10, // 10 seconds in milliseconds.
	INTERACTION_TOKEN_EXPIRY: 1000 * 60 * 15 - 1000 * 10, // 14 minutes, 50 seconds in milliseconds.
	SLOWMODE_COLLISION_TIMEOUT: 1000 * 20, // 20 seconds in milliseconds.
	PICK_MISSING_WORD_CHOICES: 4,
	SHORT_TEXT_LENGTH: 60,
	SENTENCE_PAIRS_DIRECTORY: "./assets/sentences",
} as const);

export default Object.freeze({
	...constants,
	acknowledgements,
	colours,
	components,
	contributions,
	defaults,
	emojis,
	endpoints,
	gifs,
	languages,
	licences,
	links,
	localisations,
	patterns,
	properties,
	special,
	statuses,
	time,
});
