import acknowledgements from "logos:constants/acknowledgements";
import colours from "logos:constants/colours";
import components from "logos:constants/components";
import contributions from "logos:constants/contributions";
import database from "logos:constants/database";
import defaults from "logos:constants/defaults";
import emojis from "logos:constants/emojis";
import endpoints from "logos:constants/endpoints";
import gifs from "logos:constants/gifs";
import languages from "logos:constants/languages";
import licences from "logos:constants/licences";
import links from "logos:constants/links";
import localisations from "logos:constants/localisations";
import parameters from "logos:constants/parameters";
import patterns from "logos:constants/patterns";
import properties from "logos:constants/properties";
import roles from "logos:constants/roles";
import rules from "logos:constants/rules";
import slowmode from "logos:constants/slowmode";
import special from "logos:constants/special";
import statuses from "logos:constants/statuses";
import time from "logos:constants/time";

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
	database,
	defaults,
	emojis,
	endpoints,
	gifs,
	languages,
	licences,
	links,
	localisations,
	parameters,
	patterns,
	properties,
	roles,
	rules,
	slowmode,
	special,
	statuses,
	time,
});
