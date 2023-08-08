import { FeatureLanguage, Locale, LocalisationLanguage } from "./constants/languages";
import { TimeStruct } from "./lib/database/structs/guild";

const LOCALISATION_LOCALE: Locale = "eng-US";
const LOCALISATION_LANGUAGE: LocalisationLanguage = "English/American";
const FEATURE_LOCALE: Locale = "eng-US";
const FEATURE_LANGUAGE: FeatureLanguage = "English";

const RESULTS_PER_PAGE = 10;

const RATE_LIMIT = 3;
const RATE_LIMIT_INTERVAL: TimeStruct = [30, "second"];

const MAX_DELETABLE_MESSAGES = 500;
const MAX_INDEXABLE_MESSAGES = 1000;

const REPORT_LIMIT = 2;
const REPORT_INTERVAL: TimeStruct = [30, "minute"];

const SUGGESTION_LIMIT = 3;
const SUGGESTION_INTERVAL: TimeStruct = [2, "hour"];

const PRAISE_LIMIT = 3;
const PRAISE_INTERVAL: TimeStruct = [6, "hour"];

const WARN_LIMIT = 3;
const WARN_EXPIRY: TimeStruct = [2, "month"];
const WARN_TIMEOUT: TimeStruct = [1, "day"];

const MUSIC_DISCONNECT_TIMEOUT: TimeStruct = [2, "minute"];
const MAX_VOLUME = 100;
const MAX_HISTORY_ENTRIES = 20;
const MAX_QUEUE_ENTRIES = 20;

const MIN_VOICE_CHANNELS = 0;
const MAX_VOICE_CHANNELS = 5;

const WARN_MESSAGE_DELETE_TIMEOUT = 1000 * 10; // 10 seconds in milliseconds.

export default {
	LOCALISATION_LANGUAGE,
	LOCALISATION_LOCALE,
	FEATURE_LANGUAGE,
	FEATURE_LOCALE,
	RESULTS_PER_PAGE,
	RATE_LIMIT,
	RATE_LIMIT_INTERVAL,
	MAX_DELETABLE_MESSAGES,
	MAX_INDEXABLE_MESSAGES,
	REPORT_LIMIT,
	REPORT_INTERVAL,
	SUGGESTION_LIMIT,
	SUGGESTION_INTERVAL,
	PRAISE_LIMIT,
	PRAISE_INTERVAL,
	WARN_LIMIT,
	WARN_EXPIRY,
	WARN_TIMEOUT,
	MUSIC_DISCONNECT_TIMEOUT,
	MAX_VOLUME,
	MAX_HISTORY_ENTRIES,
	MAX_QUEUE_ENTRIES,
	MIN_VOICE_CHANNELS,
	MAX_VOICE_CHANNELS,
	WARN_MESSAGE_DELETE_TIMEOUT,
};
