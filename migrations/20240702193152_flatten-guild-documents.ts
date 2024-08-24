import type { DatabaseStore } from "logos/stores/database";
import type { GuildDocument as Previous } from "logos/models/versions/guild/4.21.0";
import type { GuildDocument as Next } from "logos/models/versions/guild/latest.ts";

// This block is executed when the migration is enacted.
async function up(database: DatabaseStore): Promise<void> {
	await database.withSession(async (session) => {
		const documents = await session.query<Previous>({ collection: "Guilds" }).run();

		const transformed: Record<string, Next> = {};
		for (const document of documents) {
			const result: Next = Object.create(null);
			transformed[document.id] = result;

			result.createdAt = document.createdAt;
			result.isNative = document.isNative;
			result.languages = document.languages;

			const features = document.features;
			if (features === undefined) {
				continue;
			}

			result.enabledModules = {
				information: features.information?.enabled ?? false,
				language: features.language?.enabled ?? false,
				moderation: features.moderation?.enabled ?? false,
				server: features.server?.enabled ?? false,
				social: features.social?.enabled ?? false,
			};

			result.enabledFeatures = {
				journalling: features.information?.features?.journaling?.enabled ?? false,
				notices: features.information?.features?.notices?.enabled ?? false,
				informationNotices: features.information?.features?.notices?.features?.information?.enabled ?? false,
				resourceNotices: features.information?.features?.notices?.features?.resources?.enabled ?? false,
				roleNotices: features.information?.features?.notices?.features?.roles?.enabled ?? false,
				welcomeNotices: features.information?.features?.notices?.features?.welcome?.enabled ?? false,
				answers: features.language?.features?.answers?.enabled ?? false,
				corrections: features.language?.features?.corrections?.enabled ?? false,
				cefr: features.language?.features?.cefr?.enabled ?? false,
				game: features.language?.features?.game?.enabled ?? false,
				resources: features.language?.features?.resources?.enabled ?? false,
				translate: features.language?.features?.translate?.enabled ?? false,
				word: features.language?.features?.word?.enabled ?? false,
				context: features.language?.features?.context?.enabled ?? false,
				targetOnly: features.language?.features?.targetOnly?.enabled ?? false,
				roleLanguages: features.language?.features?.roleLanguages?.enabled ?? false,
				alerts: features.moderation?.features?.alerts?.enabled ?? false,
				policy: features.moderation?.features?.policy?.enabled ?? false,
				rules: features.moderation?.features?.rules?.enabled ?? false,
				purging: features.moderation?.features?.purging?.enabled ?? false,
				slowmode: features.moderation?.features?.slowmode?.enabled ?? false,
				timeouts: features.moderation?.features?.timeouts?.enabled ?? false,
				warns: features.moderation?.features?.warns?.enabled ?? false,
				reports: features.moderation?.features?.reports?.enabled ?? false,
				verification: features.moderation?.features?.verification?.enabled ?? false,
				dynamicVoiceChannels: features.server?.features?.dynamicVoiceChannels?.enabled ?? false,
				entry: features.server?.features?.entry?.enabled ?? false,
				roleIndicators: features.server?.features?.roleIndicators?.enabled ?? false,
				suggestions: features.server?.features?.suggestions?.enabled ?? false,
				// 'resources' is renamed to 'resourceSubmissions' to resolve conflict with
				// the 'resources' option from the language module.
				resourceSubmissions: features.server?.features?.resources?.enabled ?? false,
				tickets: features.server?.features?.tickets?.enabled ?? false,
				music: features.social?.features?.music?.enabled ?? false,
				praises: features.social?.features?.praises?.enabled ?? false,
				profile: features.social?.features?.profile?.enabled ?? false,
			};

			result.journalling = {
				purging: false,
				slowmode: false,
				timeouts: false,
				warns: false,
				reports: false,
				verification: false,
				suggestions: false,
				resourceSubmissions: false,
				tickets: false,
				praises: false,
			};

			result.features = {};

			const journaling = features.information?.features?.journaling;
			if (journaling !== undefined && journaling.channelId !== undefined) {
				result.features.journalling = {
					channelId: journaling.channelId,
				};
			}

			const notices = features.information?.features?.notices;
			if (notices !== undefined) {
				const information = notices.features?.information;
				if (
					information !== undefined &&
					information.channelId !== undefined &&
					information.inviteLink !== undefined
				) {
					result.features.informationNotices = {
						channelId: information.channelId,
						inviteLink: information.inviteLink,
					};
				}

				const resources = notices.features?.resources;
				if (resources !== undefined && resources.channelId !== undefined) {
					result.features.resourceNotices = {
						channelId: resources.channelId,
					};
				}

				const roles = notices.features?.roles;
				if (roles !== undefined && roles.channelId !== undefined) {
					result.features.roleNotices = {
						channelId: roles.channelId,
					};
				}

				const welcome = notices.features?.welcome;
				if (welcome !== undefined && welcome.channelId !== undefined && welcome.ruleChannelId !== undefined) {
					result.features.welcomeNotices = {
						channelId: welcome.channelId,
						ruleChannelId: welcome.ruleChannelId,
					};
				}
			}

			const cefr = features.language?.features?.cefr?.examples?.levels;
			if (cefr !== undefined) {
				const { a1, a2, b1, b2, c1, c2 } = cefr;
				result.features.cefr = {
					examples: { a1, a2, b1, b2, c1, c2 },
				};
			}

			const resources = features.language?.features?.resources;
			if (resources !== undefined && resources.url !== undefined) {
				result.features.resources = {
					url: resources.url,
				};
			}

			const targetOnly = features.language?.features?.targetOnly;
			if (targetOnly !== undefined && targetOnly.channelIds !== undefined) {
				result.features.targetOnly = {
					channelIds: targetOnly.channelIds,
				};
			}

			const roleLanguages = features.language?.features?.roleLanguages;
			if (roleLanguages !== undefined && roleLanguages.ids !== undefined) {
				result.features.roleLanguages = {
					ids: roleLanguages.ids,
				};
			}

			const alerts = features.moderation?.features?.alerts;
			if (alerts !== undefined && alerts.channelId !== undefined) {
				result.features.alerts = {
					channelId: alerts.channelId,
				};
			}

			const purging = features.moderation?.features?.purging;
			if (purging !== undefined && purging.journaling !== undefined) {
				result.journalling.purging = purging.journaling;
			}

			const slowmode = features.moderation?.features?.slowmode;
			if (slowmode !== undefined && slowmode.journaling !== undefined) {
				result.journalling.slowmode = slowmode.journaling;
			}

			const timeouts = features.moderation?.features?.timeouts;
			if (timeouts !== undefined && timeouts.journaling !== undefined) {
				result.journalling.timeouts = timeouts.journaling;
			}

			const warns = features.moderation?.features?.warns;
			if (warns !== undefined && warns.journaling !== undefined && warns.limit !== undefined) {
				result.journalling.warns = warns.journaling;
				result.features.warns = {
					expiration: warns.expiration,
					limit: warns.limit,
				};

				if (warns.autoTimeout?.duration !== undefined) {
					result.features.warns.autoTimeout = {
						duration: warns.autoTimeout.duration,
					};
				}
			}

			const reports = features.moderation?.features?.reports;
			if (reports !== undefined && reports.journaling !== undefined && reports.channelId !== undefined) {
				result.journalling.reports = reports.journaling;
				result.features.reports = {
					channelId: reports.channelId,
					rateLimit: reports.rateLimit,
					management: reports.management,
				};
			}

			const verification = features.moderation?.features?.verification;
			if (
				verification !== undefined &&
				verification.journaling !== undefined &&
				verification.channelId !== undefined &&
				verification.voting !== undefined &&
				verification.activation !== undefined
			) {
				result.journalling.verification = verification.journaling;
				result.features.verification = {
					channelId: verification.channelId,
					voting: verification.voting,
					activation: verification.activation,
					management: verification.management,
				};
			}

			const dynamicVoiceChannels = features.server?.features?.dynamicVoiceChannels;
			if (dynamicVoiceChannels !== undefined && dynamicVoiceChannels.channels !== undefined) {
				result.features.dynamicVoiceChannels = {
					channels: dynamicVoiceChannels.channels,
				};
			}

			const roleIndicators = features.server?.features?.roleIndicators;
			if (
				roleIndicators !== undefined &&
				roleIndicators.limit !== undefined &&
				roleIndicators.roles !== undefined
			) {
				result.features.roleIndicators = {
					limit: roleIndicators.limit,
					roles: roleIndicators.roles,
				};
			}

			const suggestions = features.server?.features?.suggestions;
			if (
				suggestions !== undefined &&
				suggestions.journaling !== undefined &&
				suggestions.channelId !== undefined
			) {
				result.journalling.suggestions = suggestions.journaling;
				result.features.suggestions = {
					channelId: suggestions.channelId,
					rateLimit: suggestions.rateLimit,
					management: suggestions.management,
				};
			}

			const resourceSubmissions = features.server?.features?.resources;
			if (
				resourceSubmissions !== undefined &&
				resourceSubmissions.journaling !== undefined &&
				resourceSubmissions.channelId !== undefined
			) {
				result.journalling.resourceSubmissions = resourceSubmissions.journaling;
				result.features.resourceSubmissions = {
					channelId: resourceSubmissions.channelId,
					rateLimit: resourceSubmissions.rateLimit,
					management: resourceSubmissions.management,
				};
			}

			const tickets = features.server?.features?.tickets;
			if (
				tickets !== undefined &&
				tickets.journaling !== undefined &&
				tickets.channelId !== undefined &&
				tickets.categoryId !== undefined
			) {
				result.journalling.tickets = tickets.journaling;
				result.features.tickets = {
					channelId: tickets.channelId,
					categoryId: tickets.categoryId,
					rateLimit: tickets.rateLimit,
					limit: tickets.limit,
					management: tickets.management,
				};
			}

			const music = features.social?.features?.music;
			if (music !== undefined && music.implicitVolume !== undefined) {
				result.features.music = {
					implicitVolume: music.implicitVolume,
				};
			}

			const praises = features.social?.features?.praises;
			if (praises !== undefined && praises.journaling !== undefined) {
				result.journalling.praises = praises.journaling;
				result.features.praises = {
					rateLimit: praises.rateLimit,
				};
			}
		}
	});
}

// This block is executed when the migration is rolled back.
function down(_: DatabaseStore): void {}

export { up, down };
