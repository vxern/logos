import { migrateDocuments } from "../helpers.js";

// This block is executed when the migration is enacted.
async function up(database) {
	await migrateDocuments(database, {
		collection: "Guilds",
		migrate: async (document) => {
			document.languages = {
				localisation: document.languages?.localisation ?? constants.defaults.LOCALISATION_LANGUAGE,
				target: document.languages?.target ?? constants.defaults.LEARNING_LANGUAGE,
				feature: document.languages?.feature ?? constants.defaults.FEATURE_LANGUAGE,
			};

			const features = document.features;
			if (features === undefined) {
				return;
			}

			document.enabledFeatures = {
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

			document.journalling = {
				purging: features.moderation?.features?.purging?.journaling ?? false,
				slowmode: features.moderation?.features?.slowmode?.journaling ?? false,
				timeouts: features.moderation?.features?.timeouts?.journaling ?? false,
				warns: features.moderation?.features?.warns?.journaling ?? false,
				reports: features.moderation?.features?.reports?.journaling ?? false,
				verification: features.moderation?.features?.verification?.journaling ?? false,
				suggestions: features.server?.features?.suggestions?.journaling ?? false,
				resourceSubmissions: features.server?.features?.resources?.journaling ?? false,
				tickets: features.server?.features?.tickets?.journaling ?? false,
				praises: features.social?.features?.praises?.journaling ?? false,
			};

			document.rateLimits = {
				reports: features.moderation?.features?.reports?.rateLimit,
				suggestions: features.server?.features?.suggestions?.rateLimit,
				resourceSubmissions: features.server?.features?.resources?.rateLimit,
				tickets: features.server?.features?.tickets?.rateLimit,
				praises: features.social?.features?.praises?.rateLimit,
			};

			document.management = {
				reports: features.moderation?.features?.reports?.management,
				verification: features.moderation?.features?.verification?.management,
				suggestions: features.server?.features?.suggestions?.management,
				resourceSubmissions: features.server?.features?.resources?.management,
				tickets: features.server?.features?.tickets?.management,
			};

			document.features = {};

			const journaling = features.information?.features?.journaling;
			if (journaling?.channelId !== undefined) {
				document.features.journalling = {
					channelId: journaling.channelId,
				};
			}

			const notices = features.information?.features?.notices;
			if (notices !== undefined) {
				const information = notices.features?.information;
				if (information?.channelId !== undefined && information.inviteLink !== undefined) {
					document.features.informationNotices = {
						channelId: information.channelId,
						inviteLink: information.inviteLink,
					};
				}

				const resources = notices.features?.resources;
				if (resources?.channelId !== undefined) {
					document.features.resourceNotices = {
						channelId: resources.channelId,
					};
				}

				const roles = notices.features?.roles;
				if (roles?.channelId !== undefined) {
					document.features.roleNotices = {
						channelId: roles.channelId,
					};
				}

				const welcome = notices.features?.welcome;
				if (welcome?.channelId !== undefined && welcome.ruleChannelId !== undefined) {
					document.features.welcomeNotices = {
						channelId: welcome.channelId,
						ruleChannelId: welcome.ruleChannelId,
					};
				}
			}

			const cefr = features.language?.features?.cefr?.examples?.levels;
			if (cefr !== undefined) {
				const { a1, a2, b1, b2, c1, c2 } = cefr;
				document.features.cefr = {
					examples: { a1, a2, b1, b2, c1, c2 },
				};
			}

			const resources = features.language?.features?.resources;
			if (resources?.url !== undefined) {
				document.features.resources = {
					url: resources.url,
				};
			}

			const targetOnly = features.language?.features?.targetOnly;
			if (targetOnly?.channelIds !== undefined) {
				document.features.targetOnly = {
					channelIds: targetOnly.channelIds,
				};
			}

			const roleLanguages = features.language?.features?.roleLanguages;
			if (roleLanguages?.ids !== undefined) {
				document.features.roleLanguages = {
					ids: roleLanguages.ids,
				};
			}

			const alerts = features.moderation?.features?.alerts;
			if (alerts?.channelId !== undefined) {
				document.features.alerts = {
					channelId: alerts.channelId,
				};
			}

			const warns = features.moderation?.features?.warns;
			if (warns?.limit !== undefined) {
				document.features.warns = {
					expiration: warns.expiration,
					limit: warns.limit,
				};

				if (warns.autoTimeout?.duration !== undefined) {
					document.features.warns.autoTimeout = {
						duration: warns.autoTimeout.duration,
					};
				}
			}

			const reports = features.moderation?.features?.reports;
			if (reports?.channelId !== undefined) {
				document.features.reports = {
					channelId: reports.channelId,
				};
			}

			const verification = features.moderation?.features?.verification;
			if (
				verification?.channelId !== undefined &&
				verification.voting !== undefined &&
				verification.activation !== undefined
			) {
				document.features.verification = {
					channelId: verification.channelId,
					voting: verification.voting,
					activation: verification.activation,
				};
			}

			const dynamicVoiceChannels = features.server?.features?.dynamicVoiceChannels;
			if (dynamicVoiceChannels?.channels !== undefined) {
				document.features.dynamicVoiceChannels = {
					channels: dynamicVoiceChannels.channels,
				};
			}

			const roleIndicators = features.server?.features?.roleIndicators;
			if (roleIndicators?.limit !== undefined && roleIndicators.roles !== undefined) {
				document.features.roleIndicators = {
					limit: roleIndicators.limit,
					roles: roleIndicators.roles,
				};
			}

			const suggestions = features.server?.features?.suggestions;
			if (suggestions?.channelId !== undefined) {
				document.features.suggestions = {
					channelId: suggestions.channelId,
				};
			}

			const resourceSubmissions = features.server?.features?.resources;
			if (resourceSubmissions?.channelId !== undefined) {
				document.features.resourceSubmissions = {
					channelId: resourceSubmissions.channelId,
				};
			}

			const tickets = features.server?.features?.tickets;
			if (tickets?.channelId !== undefined && tickets.categoryId !== undefined) {
				document.features.tickets = {
					channelId: tickets.channelId,
					categoryId: tickets.categoryId,
					limit: tickets.limit,
				};
			}

			const music = features.social?.features?.music;
			if (music?.implicitVolume !== undefined) {
				document.features.music = {
					implicitVolume: music.implicitVolume,
				};
			}
		},
	});
}

// This block is executed when the migration is rolled back.
async function down(_) {
	// No changes to make when rolling back.
}

export { up, down };
