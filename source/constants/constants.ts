import acknowledgements from "logos:constants/acknowledgements";
import colours from "logos:constants/colours";
import components from "logos:constants/components";
import contexts from "logos:constants/contexts";
import contributions from "logos:constants/contributions";
import database from "logos:constants/database";
import defaults from "logos:constants/defaults";
import dictionaries from "logos:constants/dictionaries";
import directories from "logos:constants/directories";
import emojis from "logos:constants/emojis";
import endpoints from "logos:constants/endpoints";
import gifs from "logos:constants/gifs";
import keys from "logos:constants/keys";
import languages from "logos:constants/languages";
import licences from "logos:constants/licences";
import links from "logos:constants/links";
import localisations from "logos:constants/localisations";
import logTargets from "logos:constants/log-targets";
import loggers from "logos:constants/loggers";
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
	TEST_GUILD_TEMPLATE_CODE: "EaEy336gYh3C",
	TEST_GUILD_NAME: "Logos Test Environment",
	TEST_GUILD_ICON_URL: Discord.guildIconUrl(1175841125546856608n, "24adda5d3f30a46aef193b621e3952b4", {
		format: "png",
		size: 1024,
	}),
	MAXIMUM_DELETABLE_MESSAGES: 500,
	MAXIMUM_INDEXABLE_MESSAGES: 1000,
	MAXIMUM_CORRECTION_MESSAGE_LENGTH: 3072,
	MAXIMUM_USERNAME_LENGTH: 32,
	MAXIMUM_VOLUME: 100,
	MAXIMUM_HISTORY_ENTRIES: 100,
	MAXIMUM_QUEUE_ENTRIES: 100,
	MAXIMUM_EMBED_FIELD_LENGTH: 1024,
	MAXIMUM_EMBED_DESCRIPTION_LENGTH: 3072,
	RESULTS_PER_PAGE: 10,
	STATUS_CYCLE_PERIOD: 10 * time.second,
	INTERACTION_TOKEN_EXPIRY: 15 * time.minute - 10 * time.second,
	SLOWMODE_COLLISION_TIMEOUT: 20 * time.second,
	AUTO_DELETE_MESSAGE_TIMEOUT: 10 * time.second,
	POSTPONE_MESSAGE_AFTER: time.second,
	PICK_MISSING_WORD_CHOICES: 4,
	SHORT_TEXT_LENGTH: 60,
	SENTENCE_PAIRS_TO_SHOW: 5,
} as const);

export default Object.freeze({
	...constants,
	acknowledgements,
	colours,
	components,
	contexts,
	contributions,
	database,
	defaults,
	dictionaries,
	directories,
	emojis,
	endpoints,
	gifs,
	keys,
	languages,
	licences,
	links,
	localisations,
	logTargets,
	loggers,
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
