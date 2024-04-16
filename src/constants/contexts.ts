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
	noWarningsForSelf: ({ localise, locale }) => ({
		title: localise("list.options.warnings.strings.noActiveWarnings.title", locale)(),
		description: localise("list.options.warnings.strings.noActiveWarnings.description.self", locale)(),
	}),
	noWarningsForOther: ({ localise, locale }) => ({
		title: localise("list.options.warnings.strings.noActiveWarnings.title", locale)(),
		description: localise("list.options.warnings.strings.noActiveWarnings.description.other", locale)(),
	}),
	noPraisesForSelfAsAuthor: ({ localise, locale }) => ({
		title: localise("list.options.praises.strings.noPraises.title", locale)(),
		description: localise("list.options.praises.strings.noPraises.description.self.author", locale)(),
	}),
	noPraisesForSelfAsTarget: ({ localise, locale }) => ({
		title: localise("list.options.praises.strings.noPraises.title", locale)(),
		description: localise("list.options.praises.strings.noPraises.description.self.target", locale)(),
	}),
	noPraisesForOtherAsAuthor: ({ localise, locale }) => ({
		title: localise("list.options.praises.strings.noPraises.title", locale)(),
		description: localise("list.options.praises.strings.noPraises.description.other.author", locale)(),
	}),
	noPraisesForOtherAsTarget: ({ localise, locale }) => ({
		title: localise("list.options.praises.strings.noPraises.title", locale)(),
		description: localise("list.options.praises.strings.noPraises.description.other.target", locale)(),
	}),
	praise: ({ localise, locale }) => ({
		title: localise("list.options.praises.strings.praises.title", locale)(),
		noComment: localise("list.options.praises.strings.praises.noComment", locale)(),
	}),
	warnings: ({ localise, locale }) => ({
		title: localise("list.options.warnings.strings.warnings.title", locale)(),
		warning: localise("list.options.warnings.strings.warnings.description.warning", locale),
	}),
	behaviourRule: ({ localise, locale }) => ({
		title: localise("rules.behaviour.title", locale)(),
		summary: localise("rules.behaviour.summary", locale)(),
		content: localise("rules.behaviour.content", locale)(),
	}),
	qualityRule: ({ localise, locale }) => ({
		title: localise("rules.quality.title", locale)(),
		summary: localise("rules.quality.summary", locale)(),
		content: localise("rules.quality.content", locale)(),
	}),
	relevanceRule: ({ localise, locale }) => ({
		title: localise("rules.relevance.title", locale)(),
		summary: localise("rules.relevance.summary", locale)(),
		content: localise("rules.relevance.content", locale)(),
	}),
	suitabilityRule: ({ localise, locale }) => ({
		title: localise("rules.suitability.title", locale)(),
		summary: localise("rules.suitability.summary", locale)(),
		content: localise("rules.suitability.content", locale)(),
	}),
	exclusivityRule: ({ localise, locale }) => ({
		title: localise("rules.exclusivity.title", locale)(),
		summary: localise("rules.exclusivity.summary", locale)(),
		content: localise("rules.exclusivity.content", locale)(),
	}),
	adherenceRule: ({ localise, locale }) => ({
		title: localise("rules.adherence.title", locale)(),
		summary: localise("rules.adherence.summary", locale)(),
		content: localise("rules.adherence.content", locale)(),
	}),
	otherRule: ({ localise, locale }) => ({
		title: localise("rules.other.title", locale)(),
		summary: localise("rules.other.summary", locale)(),
	}),
	roleLimitReached: ({ localise, locale }) => ({
		title: localise("warn.strings.limitReached.title", locale)(),
		description: {
			limitReached: localise("profile.options.roles.strings.limitReached.description.limitReached", locale)(),
			toChooseNew: localise("profile.options.roles.strings.limitReached.description.toChooseNew", locale)(),
		},
	}),
	previousRoleCategory: ({ localise, locale }) => ({
		back: localise("profile.options.roles.strings.back", locale)(),
	}),
	answerModal: ({ localise, locale }) => ({
		title: localise("answer.title", locale)(),
		fields: {
			question: localise("answer.fields.question", locale)(),
			answer: localise("answer.fields.answer", locale)(),
		},
	}),
	correctionModal: ({ localise, locale }) => ({
		title: localise("correction.title", locale)(),
		fields: {
			original: localise("correction.fields.original", locale)(),
			corrected: localise("correction.fields.corrected", locale)(),
		},
	}),
	correctionTextsNotDifferent: ({ localise, locale }) => ({
		title: localise("correction.strings.textsNotDifferent.title", locale)(),
		description: localise("correction.strings.textsNotDifferent.description", locale)(),
	}),
	reportModal: ({ localise, locale }) => ({
		title: localise("report.title", locale)(),
		fields: {
			reason: localise("report.fields.reason", locale)(),
			users: localise("report.fields.users", locale)(),
			link: localise("report.fields.link", locale)(),
		},
	}),
	resourceModal: ({ localise, locale }) => ({
		title: localise("resource.title", locale)(),
		fields: {
			resource: localise("resource.fields.resource", locale)(),
		},
	}),
	suggestionModal: ({ localise, locale }) => ({
		title: localise("suggestion.title", locale)(),
		fields: {
			suggestion: localise("suggestion.fields.suggestion", locale)(),
		},
	}),
	ticketModal: ({ localise, locale }) => ({
		title: localise("ticket.title", locale)(),
		topic: localise("ticket.fields.topic", locale)(),
	}),
	failedToSubmitForm: ({ localise, locale }) => ({
		title: localise("form.failedToSubmit.title", locale)(),
		description: localise("form.failedToSubmit.description", locale)(),
		continue: localise("prompts.continue", locale)(),
		cancel: localise("prompts.cancel", locale)(),
	}),
	queueEmpty: ({ localise, locale }) => ({
		title: localise("music.options.remove.strings.queueEmpty.title", locale)(),
		description: localise("music.options.remove.strings.queueEmpty.description", locale)(),
	}),
	page: ({ localise, locale }) => ({
		page: localise("interactions.page", locale)(),
	}),
	selectSongToRemove: ({ localise, locale }) => ({
		title: localise("music.options.remove.strings.selectSong.title", locale)(),
		description: localise("music.options.remove.strings.selectSong.description", locale)(),
	}),
	continuedOnNextPage: ({ localise, locale }) => ({
		continuedOnNextPage: localise("interactions.continuedOnNextPage", locale)(),
	}),
	cefrGuideBracketA: ({ localise, locale }) => ({
		brackets: {
			a: localise("cefr.strings.brackets.a", locale)(),
		},
		levels: {
			a0: {
				title: localise("cefr.strings.levels.a0.title", locale)(),
				description: localise("cefr.strings.levels.a0.description", locale)(),
			},
			a1: {
				title: localise("cefr.strings.levels.a1.title", locale)(),
				description: localise("cefr.strings.levels.a1.description", locale)(),
			},
			a2: {
				title: localise("cefr.strings.levels.a2.title", locale)(),
				description: localise("cefr.strings.levels.a2.description", locale)(),
			},
		},
	}),
	cefrGuideBracketB: ({ localise, locale }) => ({
		brackets: {
			b: localise("cefr.strings.brackets.b", locale)(),
		},
		levels: {
			b1: {
				title: localise("cefr.strings.levels.b1.title", locale)(),
				description: localise("cefr.strings.levels.b1.description", locale)(),
			},
			b2: {
				title: localise("cefr.strings.levels.b2.title", locale)(),
				description: localise("cefr.strings.levels.b2.description", locale)(),
			},
		},
	}),
	cefrGuideBracketC: ({ localise, locale }) => ({
		brackets: {
			c: localise("cefr.strings.brackets.c", locale)(),
		},
		levels: {
			c1: {
				title: localise("cefr.strings.levels.c1.title", locale)(),
				description: localise("cefr.strings.levels.c1.description", locale)(),
			},
			c2: {
				title: localise("cefr.strings.levels.c2.title", locale)(),
				description: localise("cefr.strings.levels.c2.description", locale)(),
			},
			c3: {
				title: localise("cefr.strings.levels.c3.title", locale)(),
				description: localise("cefr.strings.levels.c3.description", locale)(),
			},
		},
	}),
	cefrExamplesBracketA: ({ localise, locale }) => ({
		brackets: {
			a: localise("cefr.strings.brackets.a", locale)(),
		},
		levels: {
			a0: {
				title: localise("cefr.strings.levels.a0.title", locale)(),
			},
			a1: {
				title: localise("cefr.strings.levels.a1.title", locale)(),
			},
			a2: {
				title: localise("cefr.strings.levels.a2.title", locale)(),
			},
		},
	}),
	cefrExamplesBracketB: ({ localise, locale }) => ({
		brackets: {
			b: localise("cefr.strings.brackets.b", locale)(),
		},
		levels: {
			b1: {
				title: localise("cefr.strings.levels.b1.title", locale)(),
			},
			b2: {
				title: localise("cefr.strings.levels.b2.title", locale)(),
			},
		},
	}),
	cefrExamplesBracketC: ({ localise, locale }) => ({
		brackets: {
			c: localise("cefr.strings.brackets.c", locale)(),
		},
		levels: {
			c1: {
				title: localise("cefr.strings.levels.c1.title", locale)(),
			},
			c2: {
				title: localise("cefr.strings.levels.c2.title", locale)(),
			},
			c3: {
				title: localise("cefr.strings.levels.c3.title", locale)(),
			},
		},
	}),
	cefrButtons: ({ localise, locale }) => ({
		brackets: {
			a: localise("cefr.strings.brackets.a", locale)(),
			b: localise("cefr.strings.brackets.b", locale)(),
			c: localise("cefr.strings.brackets.c", locale)(),
		},
		tabs: {
			guide: localise("cefr.strings.tabs.guide", locale)(),
			examples: localise("cefr.strings.tabs.examples", locale)(),
		},
	}),
	cannotAnswer: ({ localise, locale }) => ({
		title: localise("answer.strings.cannotAnswer.title", locale)(),
		description: localise("answer.strings.cannotAnswer.description", locale)(),
	}),
	cannotAnswerOwn: ({ localise, locale }) => ({
		title: localise("answer.strings.cannotAnswerOwn.title", locale)(),
		description: localise("answer.strings.cannotAnswerOwn.description", locale)(),
	}),
	answer: ({ localise, locale }) => ({
		answer: localise("answer.strings.answer", locale)(),
		submittedBy: localise("answer.strings.submittedBy", locale),
	}),
} satisfies Record<string, ContextBuilder<any>>);
export type { ContextBuilder };
