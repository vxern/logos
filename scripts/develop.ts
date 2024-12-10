import { loadEnvironment } from "logos:core/loaders/environment";
import { getAvailableMigrations, migrate } from "logos:core/runners/migrator";
import { DiscordConnection } from "logos/connection";
import { DatabaseMetadata } from "logos/models/database-metadata";
import { Guild } from "logos/models/guild";
import { CacheStore } from "logos/stores/cache";
import { DatabaseStore } from "logos/stores/database";

const log = constants.loggers.feedback;

function idByName<T extends { id: bigint; name?: string }>(entities: T[], name: string): string {
	const entity = entities.find((entity) => entity.name?.includes(name));
	if (entity === undefined) {
		log.error(`Could not find entity with the name '${name}' in the test environment.`);
		log.error("If you haven't messed around with the guild yourself, report this error.");

		process.exit(1);
	}

	return entity.id.toString();
}

async function generateNewInviteCode({ channels }: { channels: Discord.Channel[] }): Promise<string> {
	return bot.helpers
		.createInvite(idByName(channels, "general"), { maxUses: 0, maxAge: 0 })
		.then((invite) => invite.code);
}

async function getInviteCode({ guildId }: { guildId: bigint }): Promise<string | undefined> {
	return bot.helpers
		.getInvites(guildId)
		.then((invites) => invites.find((invite) => invite.inviter?.id === bot.id))
		.then((invite) => invite?.code);
}

const environment = loadEnvironment({ log: constants.loggers.silent });
const connection = new DiscordConnection({
	environment,
	intents: Discord.Intents.Guilds | Discord.Intents.GuildMembers,
});
const bot = connection.bot;

await connection.open();

const database = DatabaseStore.create({
	log: constants.loggers.silent,
	environment,
	cache: new CacheStore({ log: constants.loggers.silent }),
});
await database.setup({ prefetchDocuments: false });

const availableMigrations = await getAvailableMigrations();
const metadata = await DatabaseMetadata.getOrCreate(database, { migrations: Object.keys(availableMigrations) });

await migrate({ log: constants.loggers.silent, database, metadata, availableMigrations });

const metadataDocument = await DatabaseMetadata.get(database);
if (metadataDocument === undefined) {
	log.error("Could not find database metadata.");
	log.error("Do not run this script manually: It depends on the migration script.");

	process.exit(1);
}

// If there is already a test environment set up.
if (metadataDocument.testGuildId !== undefined) {
	const guild = await bot.helpers.getGuild(metadataDocument.testGuildId).catch((_) => undefined);
	if (guild !== undefined) {
		const existingInviteCode =
			(await getInviteCode({ guildId: guild.id })) ??
			(await generateNewInviteCode({ channels: await bot.helpers.getChannels(guild.id) }));

		log.info(`You can find the test environment at: https://discord.gg/${existingInviteCode}`);

		process.exit();
	}

	// The bot no longer has access to the test environment, let's clear it.
	await metadataDocument.update(database, () => {
		metadataDocument.testGuildId = undefined;
	});
}

// First, we create a guild from the template.
const guild = await bot.helpers.createGuildFromTemplate(constants.TEST_GUILD_TEMPLATE_CODE, {
	name: constants.TEST_GUILD_NAME,
	icon: constants.TEST_GUILD_ICON_URL,
});

const channels = await bot.helpers.getChannels(guild.id);
const inviteCode = await generateNewInviteCode({ channels });
const roles = await bot.helpers.getRoles(guild.id);

// We give the bot a role with administrator permissions before we transfer the guild over to ourselves.
await bot.rest.addRole(guild.id, bot.id, idByName(roles, "Server Bot"));

const promise = Promise.withResolvers<Discord.Member>();
bot.events.guildMemberAdd = (member) => promise.resolve(member);

log.info(`Join the test environment at: https://discord.gg/${inviteCode}`);
log.info("Waiting for you to join...");

const member = await promise.promise;

// We transfer the guild over to ourselves.
await bot.rest.editGuild(guild.id, { ownerId: member.id });

const shutdown = bot.shutdown();

const document = new Guild(database, { guildId: guild.id.toString() });
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
		wordSigils: true,
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
		antiFlood: true,
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
		antiFlood: true,
		verification: true,
		suggestions: true,
		resourceSubmissions: true,
		tickets: true,
		praises: true,
	};
	document.rateLimits = {};
	document.management = {
		verification: {
			roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide")],
		},
		reports: {
			roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide")],
		},
		suggestions: {
			roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide")],
		},
		resourceSubmissions: {
			roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide"), idByName(roles, "Trainee Guide")],
		},
		tickets: {
			roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide")],
		},
	};
	document.features = {
		journalling: {
			channelId: idByName(channels, "journal"),
		},
		informationNotices: {
			channelId: idByName(channels, "rules"),
			inviteLink: `https://discord.gg/${inviteCode}`,
		},
		resourceNotices: {
			channelId: idByName(channels, "resources"),
		},
		roleNotices: {
			channelId: idByName(channels, "roles"),
		},
		welcomeNotices: {
			channelId: idByName(channels, "welcome"),
			ruleChannelId: idByName(channels, "rule"),
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
			channelIds: [idByName(channels, "romanian")],
		},
		roleLanguages: {
			ids: {},
		},
		alerts: {
			channelId: idByName(channels, "mod-chat"),
		},
		warns: {
			expiration: [2, "month"],
			limit: 3,
			autoTimeout: {
				duration: [1, "day"],
			},
		},
		reports: {
			channelId: idByName(channels, "reports"),
		},
		antiFlood: {
			interval: [5, "second"],
			messageCount: 3,
			timeoutDuration: [1, "day"],
		},
		verification: {
			channelId: idByName(channels, "verifications"),
			voting: {
				roles: [idByName(roles, "Head Guide"), idByName(roles, "Guide"), idByName(roles, "Trainee Guide")],
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
					id: idByName(channels, "Voice Chat"),
					maximum: 3,
				},
			],
		},
		roleIndicators: {
			limit: 1,
			roles: [],
		},
		suggestions: {
			channelId: idByName(channels, "suggestions"),
		},
		resourceSubmissions: {
			channelId: idByName(channels, "materials"),
		},
		tickets: {
			categoryId: idByName(channels, "Tickets"),
			channelId: idByName(channels, "tickets"),
		},
		music: {
			implicitVolume: 100,
		},
	};
});

await metadataDocument.update(database, () => {
	metadataDocument.testGuildId = guild.id.toString();
});

log.info("The test environment is ready.");

await shutdown;

process.exit();
