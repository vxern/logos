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
	withoutProficiency: ({ localise, locale }) => ({
		withoutProficiency: localise(
			"information.options.server.strings.information.description.withoutProficiency",
			locale,
		)(),
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
	queue: ({ localise, locale }) => ({
		queue: localise("music.options.queue.strings.queue", locale)(),
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
	cannotCorrect: ({ localise, locale }) => ({
		title: localise("correction.strings.cannotCorrect.title", locale)(),
		description: localise("correction.strings.cannotCorrect.description", locale)(),
	}),
	cannotCorrectOwn: ({ localise, locale }) => ({
		title: localise("correction.strings.cannotCorrectOwn.title", locale)(),
		description: localise("correction.strings.cannotCorrectOwn.description", locale)(),
	}),
	userDoesNotWantCorrections: ({ localise, locale }) => ({
		title: localise("correction.strings.userDoesNotWantCorrections.title", locale)(),
		description: localise("correction.strings.userDoesNotWantCorrections.description", locale)(),
	}),
	correctionTooLong: ({ localise, locale }) => ({
		title: localise("correction.strings.tooLong.title", locale)(),
		description: {
			tooLong: localise("correction.strings.tooLong.description.tooLong", locale)(),
			maximumLength: localise("correction.strings.tooLong.description.maximumLength", locale),
		},
	}),
	correction: ({ localise, locale }) => ({
		correction: localise("correction.strings.correction", locale)(),
		suggestedBy: localise("correction.strings.suggestedBy", locale),
	}),
	tooManyReports: ({ localise, locale }) => ({
		title: localise("report.strings.tooMany.title", locale)(),
		description: localise("report.strings.tooMany.description", locale)(),
	}),
	reportSubmitted: ({ localise, locale }) => ({
		title: localise("report.strings.submitted.title", locale)(),
		description: localise("report.strings.submitted.description", locale)(),
	}),
	tooManyResources: ({ localise, locale }) => ({
		title: localise("resource.strings.tooMany.title", locale)(),
		description: localise("resource.strings.tooMany.description", locale)(),
	}),
	resourceSent: ({ localise, locale }) => ({
		title: localise("resource.strings.sent.title", locale)(),
		description: localise("resource.strings.sent.description", locale)(),
	}),
	tooManySuggestions: ({ localise, locale }) => ({
		title: localise("suggestion.strings.tooMany.title", locale)(),
		description: localise("suggestion.strings.tooMany.description", locale)(),
	}),
	suggestionSent: ({ localise, locale }) => ({
		title: localise("suggestion.strings.sent.title", locale)(),
		description: localise("suggestion.strings.sent.description", locale)(),
	}),
	notPlayingMusicToCheck: ({ localise, locale }) => ({
		title: localise("music.strings.notPlaying.title", locale)(),
		description: localise("music.strings.notPlaying.description.toCheck", locale)(),
	}),
	notPlayingMusicToManage: ({ localise, locale }) => ({
		title: localise("music.strings.notPlaying.title", locale)(),
		description: localise("music.strings.notPlaying.description.toManage", locale)(),
	}),
	volume: ({ localise, locale }) => ({
		title: localise("music.options.volume.options.display.strings.volume.title", locale)(),
		description: localise("music.options.volume.options.display.strings.volume.description", locale),
	}),
	volumeInvalid: ({ localise, locale }) => ({
		title: localise("music.options.volume.options.set.strings.invalid.title", locale)(),
		description: localise("music.options.volume.options.set.strings.invalid.description", locale),
	}),
	volumeSet: ({ localise, locale }) => ({
		title: localise("music.options.volume.options.set.strings.set.title", locale)(),
		description: localise("music.options.volume.options.set.strings.set.description", locale),
	}),
	noSongToFastForward: ({ localise, locale }) => ({
		title: localise("music.options.fast-forward.strings.noSong.title", locale)(),
		description: localise("music.options.fast-forward.strings.noSong.description", locale)(),
	}),
	fastForwarded: ({ localise, locale }) => ({
		title: localise("music.options.fast-forward.strings.fastForwarded.title", locale)(),
		description: localise("music.options.fast-forward.strings.fastForwarded.description", locale)(),
	}),
	invalidFastForwardTimestamp: ({ localise, locale }) => ({
		title: localise("music.options.fast-forward.strings.invalidTimestamp.title", locale)(),
		description: localise("music.options.fast-forward.strings.invalidTimestamp.description", locale)(),
	}),
	autocompleteTimestamp: ({ localise, locale }) => ({
		autocomplete: localise("autocomplete.timestamp", locale)(),
	}),
	musicHistory: ({ localise, locale }) => ({
		title: localise("music.options.history.strings.playbackHistory", locale)(),
	}),
	noSongToLoop: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.noSong.title", locale)(),
		description: localise("music.options.loop.strings.noSong.description", locale)(),
	}),
	noSongCollectionToLoop: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.noSongCollection.title", locale)(),
		description: {
			noSongCollection: localise("music.options.loop.strings.noSongCollection.description.noSongCollection", locale)(),
			trySongInstead: localise("music.options.loop.strings.noSongCollection.description.trySongInstead", locale)(),
		},
	}),
	loopDisabledForSong: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.disabled.title", locale)(),
		description: localise("music.options.loop.strings.disabled.description.song", locale)(),
	}),
	loopEnabledForSong: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.enabled.title", locale)(),
		description: localise("music.options.loop.strings.enabled.description.song", locale)(),
	}),
	loopDisabledForSongCollection: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.disabled.title", locale)(),
		description: localise("music.options.loop.strings.disabled.description.songCollection", locale)(),
	}),
	loopEnabledForSongCollection: ({ localise, locale }) => ({
		title: localise("music.options.loop.strings.enabled.title", locale)(),
		description: localise("music.options.loop.strings.enabled.description.songCollection", locale)(),
	}),
	noSongToShowInformationAbout: ({ localise, locale }) => ({
		title: localise("music.options.now.strings.noSong.title", locale)(),
		description: localise("music.options.now.strings.noSong.description", locale)(),
	}),
	noSongCollectionToShowInformationAbout: ({ localise, locale }) => ({
		title: localise("music.options.now.strings.noSongCollection.title", locale)(),
		description: {
			noSongCollection: localise("music.options.now.strings.noSongCollection.description.noSongCollection", locale)(),
			trySongInstead: localise("music.options.now.strings.noSongCollection.description.trySongInstead", locale)(),
		},
	}),
	nowPlayingSong: ({ localise, locale }) => ({
		nowPlaying: localise("music.options.now.strings.nowPlaying", locale)(),
		songs: localise("music.options.now.strings.songs", locale)(),
	}),
	nowPlayingSongCollection: ({ localise, locale }) => ({
		nowPlaying: localise("music.options.now.strings.nowPlaying", locale)(),
		collection: localise("music.options.now.strings.collection", locale)(),
		track: localise("music.options.now.strings.track", locale)(),
		title: localise("music.options.now.strings.title", locale)(),
		requestedBy: localise("music.options.now.strings.requestedBy", locale)(),
		runningTime: localise("music.options.now.strings.runningTime", locale)(),
		playingSince: localise("music.options.now.strings.playingSince", locale),
		sourcedFrom: localise("music.options.now.strings.sourcedFrom", locale),
		theInternet: localise("music.options.now.strings.theInternet", locale)(),
	}),
	songNotFound: ({ localise, locale }) => ({
		title: localise("music.options.play.strings.notFound.title", locale)(),
		description: {
			notFound: localise("music.options.play.strings.notFound.description.notFound", locale)(),
			tryDifferentQuery: localise("music.options.play.strings.notFound.description.tryDifferentQuery", locale)(),
		},
	}),
	musicPaused: ({ localise, locale }) => ({
		title: localise("music.options.pause.strings.paused.title", locale)(),
		description: localise("music.options.pause.strings.paused.description", locale)(),
	}),
	stream: ({ localise, locale }) => ({
		stream: localise("music.options.play.strings.stream", locale)(),
	}),
	failedToRemoveSong: ({ localise, locale }) => ({
		title: localise("music.options.remove.strings.failed.title", locale)(),
		description: localise("music.options.remove.strings.failed.description", locale)(),
	}),
	removedSong: ({ localise, locale }) => ({
		title: localise("music.options.remove.strings.removed.title", locale)(),
		description: localise("music.options.remove.strings.removed.description", locale),
	}),
	noSongToReplay: ({ localise, locale }) => ({
		title: localise("music.options.replay.strings.noSong.title", locale)(),
		description: localise("music.options.replay.strings.noSong.description", locale)(),
	}),
	noSongCollectionToReplay: ({ localise, locale }) => ({
		title: localise("music.options.replay.strings.noSongCollection.title", locale)(),
		description: {
			noSongCollection: localise(
				"music.options.replay.strings.noSongCollection.description.noSongCollection",
				locale,
			)(),
			trySongInstead: localise("music.options.replay.strings.noSongCollection.description.trySongInstead", locale)(),
		},
	}),
	replaying: ({ localise, locale }) => ({
		title: localise("music.options.replay.strings.replaying.title", locale)(),
		description: localise("music.options.replay.strings.replaying.description", locale)(),
	}),
	notPaused: ({ localise, locale }) => ({
		title: localise("music.options.resume.strings.notPaused.title", locale)(),
		description: localise("music.options.resume.strings.notPaused.description", locale)(),
	}),
	resumed: ({ localise, locale }) => ({
		title: localise("music.options.resume.strings.resumed.title", locale)(),
		description: localise("music.options.resume.strings.resumed.description", locale)(),
	}),
	noSongToRewind: ({ localise, locale }) => ({
		title: localise("music.options.rewind.strings.noSong.title", locale)(),
		description: localise("music.options.rewind.strings.noSong.description", locale)(),
	}),
	rewound: ({ localise, locale }) => ({
		title: localise("music.options.rewind.strings.rewound.title", locale)(),
		description: localise("music.options.rewind.strings.rewound.description", locale)(),
	}),
	invalidRewindTimestamp: ({ localise, locale }) => ({
		title: localise("music.options.rewind.strings.invalidTimestamp.title", locale)(),
		description: localise("music.options.rewind.strings.invalidTimestamp.description", locale)(),
	}),
	noSongToSkipToTimestampInside: ({ localise, locale }) => ({
		title: localise("music.options.skip-to.strings.noSong.title", locale)(),
		description: localise("music.options.skip-to.strings.noSong.description", locale)(),
	}),
	skippedTo: ({ localise, locale }) => ({
		title: localise("music.options.skip-to.strings.skippedTo.title", locale)(),
		description: localise("music.options.skip-to.strings.skippedTo.description", locale)(),
	}),
	invalidSkipToTimestamp: ({ localise, locale }) => ({
		title: localise("music.options.skip-to.strings.invalidTimestamp.title", locale)(),
		description: localise("music.options.skip-to.strings.invalidTimestamp.description", locale)(),
	}),
	noSongToSkip: ({ localise, locale }) => ({
		title: localise("music.options.skip.strings.noSong.title", locale)(),
		description: localise("music.options.skip.strings.noSong.description", locale)(),
	}),
	noSongCollectionToSkip: ({ localise, locale }) => ({
		title: localise("music.options.skip.strings.noSongCollection.title", locale)(),
		description: {
			noSongCollection: localise("music.options.skip.strings.noSongCollection.description.noSongCollection", locale)(),
			trySongInstead: localise("music.options.skip.strings.noSongCollection.description.trySongInstead", locale)(),
		},
	}),
	tooManySkipArguments: ({ localise, locale }) => ({
		title: localise("music.strings.skips.tooManyArguments.title", locale)(),
		description: localise("music.strings.skips.tooManyArguments.description", locale)(),
	}),
	invalidSkipArgument: ({ localise, locale }) => ({
		title: localise("music.strings.skips.invalid.title", locale)(),
		description: localise("music.strings.skips.invalid.description", locale)(),
	}),
	skippedSong: ({ localise, locale }) => ({
		title: localise("music.options.skip.strings.skippedSong.title", locale)(),
		description: localise("music.options.skip.strings.skippedSong.description", locale)(),
	}),
	skippedSongCollection: ({ localise, locale }) => ({
		title: localise("music.options.skip.strings.skippedSongCollection.title", locale)(),
		description: localise("music.options.skip.strings.skippedSongCollection.description", locale)(),
	}),
	stopped: ({ localise, locale }) => ({
		title: localise("music.options.stop.strings.stopped.title", locale)(),
		description: localise("music.options.stop.strings.stopped.description", locale)(),
	}),
	unskipHistoryEmpty: ({ localise, locale }) => ({
		title: localise("music.options.unskip.strings.historyEmpty.title", locale)(),
		description: localise("music.options.unskip.strings.historyEmpty.description", locale)(),
	}),
	unskipQueueFull: ({ localise, locale }) => ({
		title: localise("music.options.unskip.strings.queueFull.title", locale)(),
		description: localise("music.options.unskip.strings.queueFull.description", locale)(),
	}),
	noSongCollectionToUnskip: ({ localise, locale }) => ({
		title: localise("music.options.unskip.strings.noSongCollection.title", locale)(),
		description: {
			noSongCollection: localise(
				"music.options.unskip.strings.noSongCollection.description.noSongCollection",
				locale,
			)(),
			trySongInstead: localise("music.options.unskip.strings.noSongCollection.description.trySongInstead", locale)(),
		},
	}),
	tooManyUnskipArguments: ({ localise, locale }) => ({
		title: localise("music.strings.skips.tooManyArguments.title", locale)(),
		description: localise("music.strings.skips.tooManyArguments.description", locale)(),
	}),
	unskipped: ({ localise, locale }) => ({
		title: localise("music.options.unskip.strings.unskipped.title", locale)(),
		description: localise("music.options.unskip.strings.unskipped.description", locale)(),
	}),
	cannotUseMessageForTranslation: ({ localise, locale }) => ({
		title: localise("translate.strings.cannotUse.title", locale)(),
		description: localise("translate.strings.cannotUse.description", locale)(),
	}),
	bothLanguagesInvalid: ({ localise, locale }) => ({
		title: localise("translate.strings.invalid.both.title", locale)(),
		description: localise("translate.strings.invalid.both.description", locale)(),
	}),
	sourceLanguageInvalid: ({ localise, locale }) => ({
		title: localise("translate.strings.invalid.source.title", locale)(),
		description: localise("translate.strings.invalid.source.description", locale)(),
	}),
	targetLanguageInvalid: ({ localise, locale }) => ({
		title: localise("translate.strings.invalid.target.title", locale)(),
		description: localise("translate.strings.invalid.target.description", locale)(),
	}),
	languagesNotDifferent: ({ localise, locale }) => ({
		title: localise("translate.strings.languagesNotDifferent.title", locale)(),
		description: localise("translate.strings.languagesNotDifferent.description", locale)(),
	}),
	cannotDetermineTargetLanguage: ({ localise, locale }) => ({
		title: localise("translate.strings.cannotDetermine.target.title", locale)(),
		description: {
			cannotDetermine: localise("translate.strings.cannotDetermine.target.description.cannotDetermine", locale)(),
			tryAgain: localise("translate.strings.cannotDetermine.target.description.tryAgain", locale)(),
		},
	}),
	noTranslationAdapters: ({ localise, locale }) => ({
		title: localise("translate.strings.noTranslationAdapters.title", locale)(),
		description: localise("translate.strings.noTranslationAdapters.description", locale)(),
	}),
	failedToTranslate: ({ localise, locale }) => ({
		title: localise("translate.strings.failed.title", locale)(),
		description: localise("translate.strings.failed.description", locale)(),
	}),
	cannotDetermineSourceLanguage: ({ localise, locale }) => ({
		title: localise("translate.strings.cannotDetermine.source.title", locale)(),
		description: {
			cannotDetermine: localise("translate.strings.cannotDetermine.source.description.cannotDetermine", locale)(),
			tryAgain: localise("translate.strings.cannotDetermine.source.description.tryAgain", locale)(),
		},
	}),
	languageNotSupported: ({ localise, locale }) => ({
		title: localise("translate.strings.languageNotSupported.title", locale)(),
		description: localise("translate.strings.languageNotSupported.description", locale),
	}),
	invalidRule: ({ localise, locale }) => ({
		title: localise("warn.strings.invalidRule.title", locale)(),
		description: localise("warn.strings.invalidRule.description", locale)(),
	}),
	userWarned: ({ localise, locale }) => ({
		title: localise("warn.strings.warned.title", locale)(),
		description: localise("warn.strings.warned.description", locale),
	}),
	selectSong: ({ localise, locale }) => ({
		title: localise("music.options.play.strings.selectSong.title", locale)(),
		description: localise("music.options.play.strings.selectSong.description", locale)(),
	}),
	howToSelectRoles: ({ localise, locale }) => ({
		title: localise("roles.selection.title", locale)(),
		description: {
			usingCommand: localise("roles.selection.description.usingCommand", locale),
			runAnywhere: localise("roles.selection.description.runAnywhere", locale)(),
			pressButton: localise("roles.selection.description.pressButton", locale)(),
			clickHere: localise("roles.selection.description.clickHere", locale)(),
		},
	}),
	welcomeNotice: ({ localise, locale }) => ({
		title: localise("entry.welcome.title", locale),
		description: {
			toEnter: localise("entry.welcome.description.toEnter", locale),
			acceptedRules: localise("entry.welcome.description.acceptedRules", locale)(),
		},
	}),
	reportPrompt: ({ localise, locale }) => ({
		report: {
			submittedBy: localise("submittedBy", locale)(),
			submittedAt: localise("submittedAt", locale)(),
			users: localise("reports.users", locale)(),
			reason: localise("reports.reason", locale)(),
			link: localise("reports.link", locale)(),
			noLinkProvided: localise("reports.noLinkProvided", locale)(),
		},
		previousInfractions: {
			title: localise("reports.previousInfractions", locale),
		},
		markResolved: localise("markResolved", locale)(),
		markUnresolved: localise("markUnresolved", locale)(),
		close: localise("close", locale)(),
	}),
	alreadyMarkedResolved: ({ localise, locale }) => ({
		title: localise("alreadyMarkedResolved.title", locale)(),
		description: localise("alreadyMarkedResolved.description", locale)(),
	}),
	alreadyMarkedUnresolved: ({ localise, locale }) => ({
		title: localise("alreadyMarkedUnresolved.title", locale)(),
		description: localise("alreadyMarkedUnresolved.description", locale)(),
	}),
	promptControls: ({ localise, locale }) => ({
		markResolved: localise("markResolved", locale)(),
		markUnresolved: localise("markUnresolved", locale)(),
		close: localise("close", locale)(),
		remove: localise("remove", locale)(),
	}),
	cannotRemovePrompt: ({ localise, locale }) => ({
		title: localise("cannotRemovePrompt.title", locale)(),
		description: localise("cannotRemovePrompt.description", locale)(),
	}),
	cannotCloseIssue: ({ localise, locale }) => ({
		title: localise("cannotCloseIssue.title", locale)(),
		description: localise("cannotCloseIssue.description", locale)(),
	}),
	entryRequestPrompt: ({ localise, locale }) => ({
		requestedRoles: localise("entry.verification.requestedRoles", locale)(),
		accountCreated: localise("entry.verification.accountCreated", locale)(),
		answersSubmitted: localise("entry.verification.answersSubmitted", locale)(),
		votesFor: localise("entry.verification.votesFor", locale)(),
		votesAgainst: localise("entry.verification.votesAgainst", locale)(),
		noneYet: localise("entry.verification.noneYet", locale)(),
		accept: localise("entry.verification.vote.accept", locale)(),
		acceptMultiple: localise("entry.verification.vote.acceptMultiple", locale),
		reject: localise("entry.verification.vote.reject", locale)(),
		rejectMultiple: localise("entry.verification.vote.rejectMultiple", locale),
		inquiry: localise("entry.verification.inquiry.inquiry", locale)(),
		open: localise("entry.verification.inquiry.open", locale)(),
	}),
	sureToForceAccept: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.sureToForce.accept.title", locale)(),
		description: localise("entry.verification.vote.sureToForce.accept.description", locale)(),
		yes: localise("entry.verification.vote.sureToForce.yes", locale)(),
		no: localise("entry.verification.vote.sureToForce.no", locale)(),
	}),
	alreadyVotedInFavour: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.alreadyVoted.inFavour.title", locale)(),
		description: localise("entry.verification.vote.alreadyVoted.inFavour.description", locale)(),
	}),
	sureToForceReject: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.sureToForce.reject.title", locale)(),
		description: localise("entry.verification.vote.sureToForce.reject.description", locale)(),
		yes: localise("entry.verification.vote.sureToForce.yes", locale)(),
		no: localise("entry.verification.vote.sureToForce.no", locale)(),
	}),
	alreadyVotedAgainst: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.alreadyVoted.against.title", locale)(),
		description: localise("entry.verification.vote.alreadyVoted.against.description", locale)(),
	}),
	stanceChanged: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.stanceChanged.title", locale)(),
		description: localise("entry.verification.vote.stanceChanged.description", locale)(),
	}),
	inquiryFailed: ({ localise, locale }) => ({
		title: localise("entry.verification.inquiry.failed.title", locale)(),
		description: localise("entry.verification.inquiry.failed.description", locale)(),
	}),
	inquiryOpened: ({ localise, locale }) => ({
		title: localise("entry.verification.inquiry.opened.title", locale)(),
		description: localise("entry.verification.inquiry.opened.description", locale),
	}),
	voteFailed: ({ localise, locale }) => ({
		title: localise("entry.verification.vote.failed.title", locale)(),
		description: localise("entry.verification.vote.failed.description", locale)(),
	}),
} satisfies Record<string, ContextBuilder<any>>);
export type { ContextBuilder };
