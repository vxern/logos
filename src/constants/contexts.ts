import { Locale } from "logos:constants/languages/localisation";
import { Client } from "logos/client";

type ContextBuilder<T> = ({ localise, locale }: { localise: Client["localise"]; locale: Locale }) => T;

export default Object.freeze({
	botInformation: ({ localise, locale }) => ({
		concept: {
			title: localise("information.options.bot.strings.concept.title", locale)(),
			description: localise("information.options.bot.strings.concept.description", locale)(),
		},
		function: {
			title: localise("information.options.bot.strings.function.title", locale)(),
			description: localise("information.options.bot.strings.function.description", locale)(),
			features: {
				definitions: localise("information.options.bot.strings.function.features.definitions", locale)(),
				translations: localise("information.options.bot.strings.function.features.translations", locale)(),
				games: localise("information.options.bot.strings.function.features.games", locale)(),
				messages: localise("information.options.bot.strings.function.features.messages", locale)(),
				guides: localise("information.options.bot.strings.function.features.guides", locale)(),
			},
		},
		languages: {
			title: localise("information.options.bot.strings.languages.title", locale)(),
			description: localise("information.options.bot.strings.languages.description", locale)(),
		},
	}),
	guildInformation: ({ localise, locale }) => ({
		title: localise("information.options.server.strings.information.title", locale),
		description: {
			description: {
				title: localise("information.options.server.strings.information.description.description", locale)(),
				noDescription: localise("information.options.server.strings.information.description.noDescription", locale)(),
			},
			members: localise("information.options.server.strings.information.description.members", locale)(),
			created: localise("information.options.server.strings.information.description.created", locale)(),
			channels: localise("information.options.server.strings.information.description.channels", locale)(),
			languages: localise("information.options.server.strings.information.description.languages", locale)(),
			owner: localise("information.options.server.strings.information.description.owner", locale)(),
			moderators: {
				title: localise("information.options.server.strings.information.description.moderators", locale)(),
				overseenByModerators: localise(
					"information.options.server.strings.information.description.overseenByModerators",
					locale,
				)(),
			},
			distribution: localise("information.options.server.strings.information.description.distribution", locale)(),
		},
	}),
	channelTypes: ({ localise, locale }) => ({
		text: localise("information.options.server.strings.channelTypes.text", locale)(),
		voice: localise("information.options.server.strings.channelTypes.voice", locale)(),
	}),
	languageTypes: ({ localise, locale }) => ({
		home: localise("information.options.server.strings.languageTypes.home", locale)(),
		target: localise("information.options.server.strings.languageTypes.target", locale)(),
	}),
	dictionaryLicence: ({ localise, locale }) => ({
		title: localise("license.strings.license", locale),
		fields: {
			source: localise("license.strings.source", locale)(),
			copyright: localise("license.strings.copyright", locale)(),
		},
	}),
	softwareLicence: ({ localise, locale }) => ({
		license: localise("license.strings.license", locale),
	}),
	invalidLicence: ({ localise, locale }) => ({
		title: localise("license.strings.invalid.title", locale)(),
		description: localise("license.strings.invalid.description", locale)(),
	}),
} satisfies Record<string, ContextBuilder<any>>);
export type { ContextBuilder };
