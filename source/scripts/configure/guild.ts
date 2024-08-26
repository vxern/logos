import { parseArgs } from "node:util";
import { loadEnvironment } from "logos:core/loaders/environment";
import * as bun from "bun";
import { Guild } from "logos/models/guild";
import { DatabaseStore } from "logos/stores/database";
import winston from "winston";

const { values, positionals } = parseArgs({
	args: bun.argv,
	options: {
		all: {
			type: "boolean",
			short: "a",
		},
		none: {
			type: "boolean",
			short: "n",
		},
	},
	strict: true,
	allowPositionals: true,
});

const id = positionals.at(2);
if (id === undefined) {
	winston.error("You must provide a guild ID.");
	process.exit(1);
}

if (!constants.patterns.discord.snowflake.test(id)) {
	winston.error("Guild ID invalid.");
	process.exit(1);
}

const environment = loadEnvironment();
const database = await DatabaseStore.create({ environment });
await database.setup({ prefetchDocuments: false });

if (values.all) {
	winston.info(`Enabling all features for guild with ID ${id}...`);

	const document = new Guild(database, { guildId: id });
	await document.update(database, () => {
		document.isNative = true;
		document.languages = {
			localisation: "English/American",
			target: "Romanian",
			feature: "Romanian",
		};
		document.enabledFeatures = {
			journalling: true,
			notices: true,
			informationNotices: true,
			resourceNotices: true,
			roleNotices: true,
			welcomeNotices: true,
			answers: true,
			corrections: true,
			cefr: true,
			game: true,
			resources: true,
			translate: true,
			word: true,
			context: true,
			targetOnly: true,
			roleLanguages: true,
			alerts: true,
			policy: true,
			rules: true,
			purging: true,
			slowmode: true,
			timeouts: true,
			warns: true,
			reports: true,
			verification: true,
			dynamicVoiceChannels: true,
			entry: true,
			roleIndicators: true,
			suggestions: true,
			resourceSubmissions: true,
			tickets: true,
			music: true,
			praises: true,
			profile: true,
		};
		document.journalling = {
			purging: true,
			slowmode: true,
			timeouts: true,
			warns: true,
			reports: true,
			verification: true,
			suggestions: true,
			resourceSubmissions: true,
			tickets: true,
			praises: true,
		};
		document.rateLimits = {
			reports: {
				uses: 10,
				within: [1, "hour"],
			},
		};
		document.management = {
			verification: {
				roles: ["1175841125651718182", "1175841125651718181"],
			},
			reports: {
				roles: ["1175841125651718182", "1175841125651718181"],
			},
			suggestions: {
				roles: ["1175841125651718182", "1175841125651718181"],
			},
			resourceSubmissions: {
				roles: ["1175841125651718182", "1175841125651718181", "1175841125651718180"],
			},
			tickets: {
				roles: ["1175841125651718182", "1175841125651718181"],
			},
		};
		document.features = {
			journalling: {
				channelId: "1175841126301839453",
			},
			informationNotices: {
				channelId: "1175841126750625921",
				inviteLink: "https://invite.com",
			},
			resourceNotices: {
				channelId: "1177008602897186876",
			},
			roleNotices: {
				channelId: "1175841126750625922",
			},
			welcomeNotices: {
				channelId: "1175841126750625923",
				ruleChannelId: "1175841126750625921",
			},
			cefr: {
				examples: {
					a1: "Salut!\n- Salut.\nMă numesc Marian.\nTu cum te numești?\n- Eu mă numesc Carmen.\nÎmi pare bine.\n- Încântat.",
					a2: "- Săptămâna trecută a fost frig în toată ţara.\n- Azi vremea a fost frumoasă, dar nu foarte caldă dimineaţa.\n- Condiţiile meteo sunt obişnuite pentru această lună.",
					b1: "Este nevoie, de exemplu, de soluţii pentru un transport mai rapid şi mai comod. Dacă numărul de locuitori creşte, vor fi mai multe mijloace de transport, deci mai multă poluare, mai mult zgomot şi stres... În unele oraşe, mulţi oameni folosesc acum trenul în loc de maşină.",
					b2: "Toți oamenii se nasc liberi și egali și au anumite drepturi naturale, esențiale și inalienabile; printre care se pot menționa dreptul de a se bucura și a-și apăra viețiile și libertățile; acela de a achiziționa, poseda și proteja proprietatea personală; în fine, acela de a căuta și obține siguranța și fericirea.",
					c1: "Este de așteptat ca membrii să se trateze reciproc cu respect, considerație și cu înțelegere. Comportamentul rău-intenționat sub formă de abuz verbal, discriminare, hărțuire și alte forme de comportament jignitor sau toxic nu vor fi tolerate.",
					c2: "Dar văile vuiră. Căzută în genunchi,\nÎşi ridicase capul, îl clătină spre stele,\nÎl prăvăli apoi, stârnind pe apă\nFugare roiuri negre de mărgele.\nO pasăre albastră zvâcnise dintre ramuri,\nŞi viaţa căprioarei spre zările târzii\nZburase lin, cu ţipăt, ca păsările toamna\nCând lasă cuiburi sure şi pustii.\nÎmpleticit m-am dus şi i-am închis\nOchii umbroşi, trist străjuiţi de coarne,\nŞi-am tresărit tăcut şi alb când tata\nMi-a şuierat cu bucurie: - Avem carne!",
				},
			},
			resources: {
				url: "https://github.com/vxern/romanian",
			},
			targetOnly: {
				channelIds: ["1175841127019053139"],
			},
			alerts: {
				channelId: "1175841126750625914",
			},
			warns: {
				expiration: [2, "month"],
				limit: 3,
				autoTimeout: {
					duration: [1, "day"],
				},
			},
			reports: {
				channelId: "1175841126301839455",
			},
			verification: {
				channelId: "1175841126301839454",
				voting: {
					roles: ["1175841125651718182", "1175841125651718181", "1175841125651718180"],
					verdict: {
						acceptance: {
							type: "fraction",
							value: 0.33,
						},
						rejection: {
							type: "fraction",
							value: 0.5,
						},
					},
				},
				activation: [
					{
						type: "account-age",
						value: [6, "month"],
					},
				],
			},
			dynamicVoiceChannels: {
				channels: [
					{
						id: "1175841127019053143",
						maximum: 3,
					},
				],
			},
			suggestions: {
				channelId: "1175841126301839456",
			},
			resourceSubmissions: {
				channelId: "1176985038030651533",
			},
			tickets: {
				categoryId: "1177959378888949822",
				channelId: "1177959817000800266",
			},
			music: {
				implicitVolume: 100,
			},
		};
	});

	winston.info("Features enabled!");
}

if (values.none) {
	winston.info(`Disabling all features for guild with ID ${id}...`);

	const document = new Guild(database, { guildId: id });
	await document.update(database, () => {
		document.isNative = false;
		document.enabledFeatures = {
			journalling: false,
			notices: false,
			informationNotices: false,
			resourceNotices: false,
			roleNotices: false,
			welcomeNotices: false,
			answers: false,
			corrections: false,
			cefr: false,
			game: false,
			resources: false,
			translate: false,
			word: false,
			context: false,
			targetOnly: false,
			roleLanguages: false,
			alerts: false,
			policy: false,
			rules: false,
			purging: false,
			slowmode: false,
			timeouts: false,
			warns: false,
			reports: false,
			verification: false,
			dynamicVoiceChannels: false,
			entry: false,
			roleIndicators: false,
			suggestions: false,
			resourceSubmissions: false,
			tickets: false,
			music: false,
			praises: false,
			profile: false,
		};
	});

	winston.info("Features disabled!");
}

await database.teardown();
