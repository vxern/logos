import {
	FeatureLanguage,
	LearningLanguage,
	Locale,
	LocalisationLanguage,
	TranslationLanguage,
} from "./constants/languages";
import { RateLimit, TimeStruct } from "./lib/database/guild";

const PROJECT_NAME = "Logos";
const USER_AGENT = "Logos (https://logos.wordcollector.co.uk)";

const SENTENCE_PAIRS_DIRECTORY = "./assets/sentences";

const FEATURE_LOCALE: Locale = "eng-US";
const FEATURE_LANGUAGE: FeatureLanguage = "English";
const LEARNING_LOCALE: Locale = "eng-US";
const LEARNING_LANGUAGE: LearningLanguage = "English/American";
const LOCALISATION_LOCALE: Locale = "eng-US";
const LOCALISATION_LANGUAGE: LocalisationLanguage = "English/American";
const TRANSLATION_LANGUAGE: TranslationLanguage = "English/American";

const RESULTS_PER_PAGE = 10;

const MAX_DELETABLE_MESSAGES = 500;
const MAX_INDEXABLE_MESSAGES = 1000;

// TODO(vxern): Loosen these way up.
const COMMAND_RATE_LIMIT: RateLimit = { uses: 3, within: [30, "second"] };
const REPORT_RATE_LIMIT: RateLimit = { uses: 2, within: [30, "minute"] };
const RESOURCE_RATE_LIMIT: RateLimit = { uses: 2, within: [30, "second"] };
const SUGGESTION_RATE_LIMIT: RateLimit = { uses: 3, within: [2, "hour"] };
const TICKET_RATE_LIMIT: RateLimit = { uses: 2, within: [1, "day"] };
const PRAISE_RATE_LIMIT: RateLimit = { uses: 3, within: [6, "hour"] };

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

const STATUS_CYCLE = 1000 * 10; // 10 seconds in milliseconds.

const GAME_WORD_SELECTION = 4;

const SHORT_TEXT_LENGTH = 60;

export default {
	PROJECT_NAME,
	USER_AGENT,
	SENTENCE_PAIRS_DIRECTORY,
	LOCALISATION_LANGUAGE,
	LOCALISATION_LOCALE,
	LEARNING_LANGUAGE,
	LEARNING_LOCALE,
	FEATURE_LANGUAGE,
	FEATURE_LOCALE,
	TRANSLATION_LANGUAGE,
	RESULTS_PER_PAGE,
	MAX_DELETABLE_MESSAGES,
	MAX_INDEXABLE_MESSAGES,
	COMMAND_RATE_LIMIT,
	REPORT_RATE_LIMIT,
	RESOURCE_RATE_LIMIT,
	TICKET_RATE_LIMIT,
	SUGGESTION_RATE_LIMIT,
	PRAISE_RATE_LIMIT,
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
	GAME_WORD_SELECTION,
	STATUS_CYCLE,
	SHORT_TEXT_LENGTH,
};
