import acknowledgements from "rost:constants/acknowledgements";
import colours from "rost:constants/colours";
import components from "rost:constants/components";
import contexts from "rost:constants/contexts";
import contributions from "rost:constants/contributions";
import database from "rost:constants/database";
import defaults from "rost:constants/defaults";
import dictionaries from "rost:constants/dictionaries";
import directories from "rost:constants/directories";
import discord from "rost:constants/discord";
import emojis from "rost:constants/emojis";
import endpoints from "rost:constants/endpoints";
import gifs from "rost:constants/gifs";
import keys from "rost:constants/keys";
import languages from "rost:constants/languages";
import lengths from "rost:constants/lengths";
import licences from "rost:constants/licences";
import links from "rost:constants/links";
import localisations from "rost:constants/localisations";
import logTargets from "rost:constants/log-targets";
import loggers from "rost:constants/loggers";
import parameters from "rost:constants/parameters";
import patterns from "rost:constants/patterns";
import properties from "rost:constants/properties";
import roles from "rost:constants/roles";
import rules from "rost:constants/rules";
import slowmode from "rost:constants/slowmode";
import special from "rost:constants/special";
import statuses from "rost:constants/statuses";
import time from "rost:constants/time";

const constants = Object.freeze({
	PROJECT_NAME: "Rost",
	USER_AGENT: "Rost (https://github.com/vxern/rost)",
	TEST_GUILD_TEMPLATE_CODE: "EaEy336gYh3C",
	TEST_GUILD_NAME: "Rost Test Environment",
	TEST_GUILD_ICON_URL: Discord.guildIconUrl(1175841125546856608n, "24adda5d3f30a46aef193b621e3952b4", {
		format: "png",
		size: 1024,
	}),
	MAXIMUM_DELETABLE_MESSAGES: 500,
	MAXIMUM_INDEXABLE_MESSAGES: 1000,
	MAXIMUM_CORRECTION_MESSAGE_LENGTH: 3072,
	MAXIMUM_VOLUME: 100,
	MAXIMUM_HISTORY_ENTRIES: 100,
	MAXIMUM_QUEUE_ENTRIES: 100,
	RESULTS_PER_PAGE: 10,
	STATUS_CYCLE_PERIOD: 10 * time.second,
	SLOWMODE_COLLISION_TIMEOUT: 5 * time.second,
	AUTO_DELETE_MESSAGE_TIMEOUT: 10 * time.second,
	PICK_MISSING_WORD_CHOICES: 4,
	SHORT_TEXT_LENGTH: 60,
	SENTENCE_PAIRS_TO_SHOW: 5,
	ROW_INDENTATION: 3,
	DEFINITIONS_PER_VIEW: 5,
	TRANSLATIONS_PER_VIEW: 5,
	EXPRESSIONS_PER_VIEW: 5,
	EXAMPLES_PER_VIEW: 5,
	DEFINITIONS_PER_VERBOSE_VIEW: 1,
	TRANSLATIONS_PER_VERBOSE_VIEW: 1,
	EXPRESSIONS_PER_VERBOSE_VIEW: 1,
	EXAMPLES_PER_VERBOSE_VIEW: 1,
	INCLUDE_EXPRESSION_RELATIONS: false,
	SEARCH_MODE: "word",
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
	discord,
	emojis,
	endpoints,
	gifs,
	keys,
	languages,
	lengths,
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
