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
		document.features = {
			information: {
				enabled: true,
				features: {
					journaling: {
						enabled: true,
						channelId: "1175841126301839453",
					},
					notices: {
						enabled: true,
						features: {
							information: {
								enabled: true,
								channelId: "1175841126750625921",
								inviteLink: "https://invite.com",
							},
							resources: {
								enabled: true,
								channelId: "1177008602897186876",
							},
							roles: {
								enabled: true,
								channelId: "1175841126750625922",
							},
							welcome: {
								enabled: true,
								channelId: "1175841126750625923",
								ruleChannelId: "1175841126750625921",
							},
						},
					},
				},
			},
			language: {
				enabled: true,
				features: {
					answers: {
						enabled: true,
					},
					corrections: {
						enabled: true,
					},
					cefr: {
						enabled: true,
						extended: true,
						examples: {
							enabled: true,
							levels: {
								a0: "Salut!\n- Salut.\nMă numesc Marian.\nTu cum te numești?\n- Eu mă numesc Carmen.\nÎmi pare bine.\n- Încântat.",
								a1: "- Săptămâna trecută a fost frig în toată ţara.\n- Azi vremea a fost frumoasă, dar nu foarte caldă dimineaţa.\n- Condiţiile meteo sunt obişnuite pentru această lună.",
								a2: "Este nevoie, de exemplu, de soluţii pentru un transport mai rapid şi mai comod. Dacă numărul de locuitori creşte, vor fi mai multe mijloace de transport, deci mai multă poluare, mai mult zgomot şi stres... În unele oraşe, mulţi oameni folosesc acum trenul în loc de maşină.",
								b1: "Toți oamenii se nasc liberi și egali și au anumite drepturi naturale, esențiale și inalienabile; printre care se pot menționa dreptul de a se bucura și a-și apăra viețiile și libertățile; acela de a achiziționa, poseda și proteja proprietatea personală; în fine, acela de a căuta și obține siguranța și fericirea.",
								b2: "Este de așteptat ca membrii să se trateze reciproc cu respect, considerație și cu înțelegere. Comportamentul rău-intenționat sub formă de abuz verbal, discriminare, hărțuire și alte forme de comportament jignitor sau toxic nu vor fi tolerate.",
								c1: "În timpul celui de-al Doilea Război Mondial (în 1940), România Mare, sub presiunea Germaniei Naziste, a cedat teritorii Ungariei (nord-estul Transilvaniei), Bulgariei (Cadrilaterul) și Uniunii Sovietice (Basarabia, Herța și Bucovina de Nord). După abolirea dictaturii lui Antonescu la 23 august 1944, România s-a retras din alianța cu Puterile Axei, trecând de partea Puterilor Aliate (Regatul Unit, Statele Unite, Franța și Uniunea Sovietică). Prin Tratatul de pace de la Paris semnat la 10 februarie 1947, din teritoriile cedate ale fostei Românii Mari, a fost recuperat Transilvania de Nord. ",
								c2: "Dar văile vuiră. Căzută în genunchi,\nÎşi ridicase capul, îl clătină spre stele,\nÎl prăvăli apoi, stârnind pe apă\nFugare roiuri negre de mărgele.\nO pasăre albastră zvâcnise dintre ramuri,\nŞi viaţa căprioarei spre zările târzii\nZburase lin, cu ţipăt, ca păsările toamna\nCând lasă cuiburi sure şi pustii.\nÎmpleticit m-am dus şi i-am închis\nOchii umbroşi, trist străjuiţi de coarne,\nŞi-am tresărit tăcut şi alb când tata\nMi-a şuierat cu bucurie: - Avem carne!",
								c3: "Neînduplecat, țintuind privirea,\nÎnverșunat, stăpânindu-mi firea,\nPrecumpănit în sine,\nÎnalț de sus în jos tihnirea,\nSă pozvolească iznoavei\nTrăinicie în-deplinire.",
							},
						},
					},
					game: {
						enabled: true,
					},
					resources: {
						enabled: true,
						url: "https://resources.org",
					},
					translate: {
						enabled: true,
					},
					word: {
						enabled: true,
					},
					targetOnly: {
						enabled: true,
						channelIds: ["1175841127019053139"],
					},
				},
			},
			moderation: {
				enabled: true,
				features: {
					alerts: {
						enabled: true,
						channelId: "1175841126750625914",
					},
					policy: {
						enabled: true,
					},
					rules: {
						enabled: true,
					},
					slowmode: {
						enabled: true,
						journaling: true,
					},
					timeouts: {
						enabled: true,
						journaling: true,
					},
					purging: {
						enabled: true,
						journaling: true,
					},
					warns: {
						enabled: true,
						journaling: true,
						expiration: [2, "month"],
						limit: 3,
						autoTimeout: {
							enabled: true,
							duration: [1, "day"],
						},
					},
					reports: {
						enabled: true,
						journaling: true,
						channelId: "1175841126301839455",
						rateLimit: {
							uses: 10,
							within: [1, "hour"],
						},
						management: {
							roles: ["1175841125651718182", "1175841125651718181"],
						},
					},
					verification: {
						enabled: true,
						journaling: true,
						channelId: "1175841126301839454",
						management: {
							roles: ["1175841125651718182", "1175841125651718181"],
						},
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
				},
			},
			server: {
				enabled: true,
				features: {
					dynamicVoiceChannels: {
						enabled: true,
						channels: [
							{
								id: "1175841127019053143",
								maximum: 3,
							},
						],
					},
					entry: {
						enabled: true,
					},
					suggestions: {
						enabled: true,
						journaling: true,
						channelId: "1175841126301839456",
						management: {
							roles: ["1175841125651718182", "1175841125651718181"],
						},
					},
					resources: {
						enabled: true,
						journaling: true,
						channelId: "1176985038030651533",
						management: {
							roles: ["1175841125651718182", "1175841125651718181", "1175841125651718180"],
						},
					},
					tickets: {
						enabled: true,
						journaling: true,
						categoryId: "1177959378888949822",
						channelId: "1177959817000800266",
						management: {
							roles: ["1175841125651718182", "1175841125651718181"],
						},
					},
				},
			},
			social: {
				enabled: true,
				features: {
					music: {
						enabled: true,
						implicitVolume: 100,
					},
					praises: {
						enabled: true,
						journaling: true,
					},
					profile: {
						enabled: true,
					},
				},
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
		document.languages = undefined;
		document.features = undefined;
	});

	winston.info("Features disabled!");
}

await database.teardown();
