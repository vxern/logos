import { ApplicationCommandOptionTypes } from 'discordeno';
import { Expressions } from 'logos/assets/localisations/expressions.ts';
import {
	getLocaleByLanguage,
	getLocalisationsForLanguage,
	localise,
	TranslationLanguage,
	typedLocalisations,
} from 'logos/assets/localisations/utils.ts';
import { capitalise, code, list } from 'logos/formatting.ts';
import { Language } from 'logos/types.ts';

class Commands {
	static readonly information = typedLocalisations({
		name: {
			'English': 'information',
			'Polish': 'informacje',
			'Romanian': 'informații',
		},
		description: {
			'English': 'Used to display various information.',
			'Polish': 'Komenda używania do wyświetlania różnych informacji.',
			'Romanian': 'Comandă utilizată pentru afișarea diverselor informații.',
		},
		options: {
			bot: {
				name: {
					'English': 'bot',
					'Polish': 'bot',
					'Romanian': 'bot',
				},
				description: {
					'English': 'Displays information about the bot.',
					'Polish': 'Wyświetla informacje o bocie.',
					'Romanian': 'Afișează informații despre bot.',
				},
				strings: {
					whoAmI: {
						header: {
							'English': 'Who am I?',
							'Polish': 'Kim jestem?',
							'Romanian': 'Cine sunt?',
						},
						body: {
							'English': (botUsername: string) =>
								`I am **${botUsername}**, an application created to offer language-learning Discord communities with the highest quality features, such as:
              ${
									list([
										'🫂 Rich social interactions',
										'💼 Intuitive role management',
										'📚 Translation and morphology look-ups',
										'🎶 Music playback',
										'📜 Article creation',
										'🔁 Server structure synchronisation',
									])
								}`,
							'Polish': (botUsername: string) =>
								`Nazywam się **${botUsername}**. Jestem aplikacją stworzoną do zaoferowania społecznościom języcznym na Discordzie najwyższej jakości funkcji, takich jak:
              ${
									list([
										'🫂 Bogate interakcje socjalne',
										'💼 Intuitywne wybieranie ról',
										'📚 Tłumaczenia, wyszukiwanie znaczeń oraz innych informacji o słowach',
										'🎶 Odtwarzanie muzyki',
										'📜 Tworzenie oraz czytanie artykułów lingwistycznych',
										'🔁 Synchronizacja struktury serwera',
									])
								}`,
							'Romanian': (botUsername: string) =>
								`Mă numesc **${botUsername}**. Sunt o aplicație creată pentru a oferi comunităților lingvistice Discord funcții de cea mai înaltă calitate, cum ar fi:
              ${
									list([
										'🫂 Interacțiuni sociale bogate',
										'💼 Gestionarea intuitivă a rolurilor',
										'📚 Traduceri și căutarea cuvintelor',
										'🎶 Redarea muzicii',
										'📜 Crearea și citirea articolelor lingvistice',
										'🔁 Sincronizarea structurii serverului',
									])
								}`,
						},
					},
					howWasIMade: {
						header: {
							'English': 'How was I made?',
							'Polish': 'Jak mnie stworzono?',
							'Romanian': 'Cum am fost creat?',
						},
						body: (typescript: string, deno: string, discordApiLink: string, discordeno: string) => ({
							'English': `I am powered by ${typescript} running within ${deno}. ` +
								`I interact with [Discord\'s API](${discordApiLink}) with the help of the ${discordeno} library.`,
							'Polish': `Jestem zasilany przez ${typescript}, działający w ramach ${deno}. ` +
								`Współdziałam z [API Discorda](${discordApiLink}) za pomocą biblioteki ${discordeno}.`,
							'Romanian': `Sunt alimentat de către ${typescript}, care se execută în cadrul ${deno}. ` +
								`Interacționez cu [API-ul Discord-ului](${discordApiLink}) cu ajutorul bibliotecii ${discordeno}.`,
						}),
					},
					howToAddToServer: {
						header: {
							'English': 'How can you add me to your server?',
							'Polish': 'Jak można dodać mnie na własny serwer?',
							'Romanian': 'Cum poți să mă adaugi pe serverul tău?',
						},
						body: (learnArmenian: string, learnRomanian: string) => ({
							'English': `It is not possible at this point in time. ` +
								`I was made for the purpose of managing a select few language-learning communities, such as ${learnArmenian} and ${learnRomanian}.`,
							'Polish': `Na chwilę obecną nie można tego zrobić. ` +
								`Zostałem stworzony w celu zarządzania kilkoma wybranymi społecznościami językowymi, takimi jak ${learnArmenian} oraz ${learnRomanian}.`,
							'Romanian': `La acest moment asta nu este posibil. ` +
								`Am fost creat cu scopul de a nu gestiona decât câteva comunități lingvistice selecte, cum ar fi ${learnArmenian} și ${learnRomanian}.`,
						}),
					},
					amIOpenSource: {
						header: {
							'English': 'Am I open-source?',
							'Polish': 'Czy mój kod źródłowy jest publiczny?',
							'Romanian': 'Sunt open-source?',
						},
						body: {
							'English': (talonRepositoryLink: string) =>
								`Unfortunately, no. ` +
								`However, my predecessor, Talon, *is*. ` +
								`You can view his source code [here](${talonRepositoryLink}).`,
							'Polish': (talonRepositoryLink: string) =>
								`Niestety nie, chociaż kod źródłowy mojego poprzednika, Talona, jest publiczny. ` +
								`Można zajrzeć w jego kod źródłowy [o tu](${talonRepositoryLink}).`,
							'Romanian': (talonRepositoryLink: string) =>
								`Nu, din păcate. ` +
								`Deși, codul-sursă al predecesorului meu, al lui Talon, este public. ` +
								`Îl puteți vedea [chiar aici](${talonRepositoryLink}).`,
						},
					},
				},
			},
			guild: {
				name: {
					'English': 'server',
					'Polish': 'serwer',
					'Romanian': 'server',
				},
				description: {
					'English': 'Displays information about the server.',
					'Polish': 'Wyświetla informacje o serwerze.',
					'Romanian': 'Afișează informații despre server.',
				},
				strings: {
					informationAbout: {
						'English': (guildName: string) => `Information about **${guildName}**`,
						'Polish': (guildName: string) => `Informacje o **${guildName}**`,
						'Romanian': (guildName: string) => `Informații despre **${guildName}**`,
					},
					noDescription: {
						'English': 'No description provided.',
						'Polish': 'Brak opisu.',
						'Romanian': 'Fără descriere.',
					},
					overseenByModerators: {
						'English': (moderatorRoleName: string) =>
							`This server is overseen by a collective of ${moderatorRoleName}s.`,
						'Polish': (moderatorRoleName: string) =>
							`Ten serwer jest nadzorowany poprzez grupę osób z rolą **${capitalise(moderatorRoleName)}**.`,
						'Romanian': (moderatorRoleName: string) =>
							`Acest server este supravegheat de cătr-un grup de oameni cu rolul **${capitalise(moderatorRoleName)}**.`,
					},
					withoutProficiencyRole: {
						'English': 'without a specified language proficiency.',
						'Polish': 'bez określonej znajomości języka.',
						'Romanian': 'fără o competență lingvistică specificată.',
					},
					fields: {
						description: {
							'English': 'Description',
							'Polish': 'Opis',
							'Romanian': 'Descriere',
						},
						members: {
							'English': 'Members',
							'Polish': 'Członkowie',
							'Romanian': 'Membri',
						},
						created: {
							'English': 'Created',
							'Polish': 'Stworzony',
							'Romanian': 'Creat',
						},
						channels: {
							'English': 'Channels',
							'Polish': 'Kanały',
							'Romanian': 'Canale',
						},
						owner: {
							'English': 'Owner',
							'Polish': 'Właściciel',
							'Romanian': 'Properietar',
						},
						moderators: {
							'English': 'Moderators',
							'Polish': 'Moderatorzy',
							'Romanian': 'Moderatori',
						},
						distributionOfMembersLanguageProficiency: {
							'English': 'Distribution of members\' language proficiency',
							'Polish': 'Rozkład biegłości języcznej członków serwera',
							'Romanian': 'Distribuția competențelor lingvistice ale membrilor',
						},
					},
					channelTypes: {
						text: {
							'English': 'Text',
							'Polish': 'Tekstowe',
							'Romanian': 'de Text',
						},
						voice: {
							'English': 'Voice',
							'Polish': 'Głosowe',
							'Romanian': 'de Voce',
						},
					},
				},
			},
		},
	});

	static readonly game = typedLocalisations({
		name: {
			'English': 'game',
			'Polish': 'gra',
			'Romanian': 'joc',
		},
		description: {
			'English': 'Pick the correct word out of four to fit in the blank.',
			'Polish': 'Wybierz słowo, które pasuje do luki w zdaniu.',
			'Romanian': 'Alege cuvântul care se potrivește cu spațiul gol din propoziție.',
		},
		strings: {
			sentence: {
				'English': 'Sentence',
				'Polish': 'Zdanie',
				'Romanian': 'Propoziție',
			},
			translation: {
				'English': 'Translation',
				'Polish': 'Tłumaczenie',
				'Romanian': 'Traducere',
			},
			noSentencesAvailable: {
				'English': 'There are no sentences available in the requested language.',
				'Polish': 'Nie ma zdań dostępnych w tym języku.',
				'Romanian': 'Nu sunt propoziții disponibile în această limbă.',
			},
		},
	});

	static readonly resources = typedLocalisations({
		name: {
			'English': 'resources',
			'Polish': 'zasoby',
			'Romanian': 'resurse',
		},
		description: {
			'English': 'Displays a list of resources to learn the language.',
			'Polish': 'Wyświetla listę zasób do nauki języka.',
			'Romanian': 'Afișează o listă cu resurse pentru învățarea limbii.',
		},
		strings: {
			// No full stop here.
			resourcesStoredHere: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('English'));

					return `We store resources for learning ${languageLocalised} just here`;
				},
				'Polish': (language: Language) => {
					const languageLocalised = Expressions.polish.cases.genitive.languages[language].toLowerCase();

					return `Przechowywujemy swoje zasoby do nauki ${languageLocalised} o tu`;
				},
				'Romanian': (language: Language) => {
					const languageLocalised = Expressions.romanian.cases.genitive.indefinite.languages[language];

					return `Stocăm resursele pentru învățatul limbii ${languageLocalised} chiar aici`;
				},
			},
		},
	});

	static readonly translate = typedLocalisations({
		name: {
			'English': 'translate',
			'Polish': 'przetłumacz',
			'Romanian': 'traducere',
		},
		description: {
			'English': 'Translates a text from the source language to the target language.',
			'Polish': 'Tłumaczy dany tekst z języka źródłowego na język docelowy.',
			'Romanian': 'Traduce textul dat din limbă-sursă în limbă-țintă.',
		},
		options: {
			// If your language has a grammatical case to express the idea of 'translate __from English__',
			// use the word 'source' here.
			from: {
				name: {
					'English': 'from',
					'Polish': 'z',
					'Romanian': 'din',
				},
				description: {
					'English': 'The source language.',
					'Polish': 'Język źródłowy.',
					'Romanian': 'Limbă-sursă.',
				},
			},
			// If your language has a grammatical case to express the idea of 'translate __to English__',
			// use the word 'target' here.
			to: {
				name: {
					'English': 'to',
					'Polish': 'na',
					'Romanian': 'în',
				},
				description: {
					'English': 'The target language.',
					'Polish': 'Język docelowy.',
					'Romanian': 'Limbă-țintă.',
				},
			},
			text: {
				name: {
					'English': 'text',
					'Polish': 'tekst',
					'Romanian': 'text',
				},
				description: {
					'English': 'The text to translate.',
					'Polish': 'Tekst do przetłumaczenia.',
					'Romanian': 'Text de tradus.',
				},
			},
		},
		strings: {
			targetLanguageMustBeDifferentFromSource: {
				'English': 'The target language may not be the same as the source language.',
				'Polish': 'Język docelowy nie może być taki sam jak język źródłowy.',
				'Romanian': 'Limba-țintă nu poate fi aceeași cu limba-sursă.',
			},
			textCannotBeEmpty: {
				'English': 'The source text may not be empty.',
				'Polish': 'Tekst źródłowy nie może być pusty.',
				'Romanian': 'Câmpul pentru text-sursă nu poate fi gol.',
			},
			failed: {
				'English': 'Failed to translate the given text.',
				'Polish': 'Tłumaczenie danego tekstu nie powiodło się.',
				'Romanian': 'Traducerea textului dat nu a reușit.',
			},
			invalid: {
				source: {
					'English': 'The source language is invalid.',
					'Polish': 'Język źródłowy jest nieprawidłowy.',
					'Romanian': 'Limba-sursă este nevalidă.',
				},
				target: {
					'English': 'The target language is invalid.',
					'Polish': 'Język docelowy jest nieprawidłowy.',
					'Romanian': 'Limba-țintă este nevalidă.',
				},
				both: {
					'English': 'Both the source and target languages are invalid.',
					'Polish': 'Oba języki źródłowy oraz docelowy są nieprawidłowe.',
					'Romanian': 'Atât limba-sursă, cât și limba-țintă sunt nevalide.',
				},
			},
			// This word comes after your translation for the word 'from', as in 'translate from English'.
			// If you have used the word 'source' instead of 'from', use the nominative case.
			sourceLanguage: {
				'English': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('English'));

					return languageLocalised;
				},
				'Polish': (language: TranslationLanguage) => {
					const languageLocalised = Expressions.polish.cases.genitive.languages[language];

					return languageLocalised;
				},
				'Romanian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('Romanian'));

					return languageLocalised;
				},
			},
			// This word comes after your translation for the word 'to', as in 'translate to English'.
			// If you have used the word 'target' instead of 'to', use the nominative case.
			targetLanguage: {
				'English': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('English'));

					return languageLocalised;
				},
				'Polish': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('Polish'));

					return languageLocalised;
				},
				'Romanian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('Romanian'));

					return languageLocalised;
				},
			},
			sourceText: {
				'English': 'Source Text',
				'Polish': 'Tekst Źródłowy',
				'Romanian': 'Text-sursă',
			},
			translation: {
				'English': 'Translation',
				'Polish': 'Tłumaczenie',
				'Romanian': 'Traducere',
			},
		},
	});

	static readonly word = typedLocalisations({
		name: {
			'English': 'word',
			'Polish': 'słowo',
			'Romanian': 'cuvânt',
		},
		description: {
			'English': 'Displays information about a given word.',
			'Polish': 'Wyświetla informacje o danym słowie.',
			'Romanian': 'Afișează informații despre un anumit cuvânt.',
		},
		options: {
			word: {
				name: {
					'English': 'word',
					'Polish': 'słowo',
					'Romanian': 'cuvânt',
				},
				description: {
					'English': 'The word to display information about.',
					'Polish': 'Słowo, o którym mają być wyświetlone informacje.',
					'Romanian': 'Cuvântul despre care să fie afișate informații.',
				},
			},
			verbose: {
				name: {
					'English': 'verbose',
					'Polish': 'tryb-rozwlekły',
					'Romanian': 'mod-prolix',
				},
				description: {
					'English': 'If set to true, more (possibly unnecessary) information will be shown.',
					'Polish': 'Jeśli tak, więcej (możliwie niepotrzebnych) informacji będzie pokazanych.',
					'Romanian': 'Dacă da, mai multe (posibil inutile) informații vor fi afișate.',
				},
			},
		},
		strings: {
			noDictionaryAdapters: {
				'English': 'There are no dictionaries available in the requested language.',
				'Polish': 'Nie ma słowników dostępnych w tym języku.',
				'Romanian': 'Nu sunt dicționare disponibile în această limbă.',
			},
			noResults: {
				'English': 'No results.',
				'Polish': 'Brak wyników.',
				'Romanian': 'Fără rezultate.',
			},
			fields: {
				translations: {
					'English': 'Translations',
					'Polish': 'Tłumaczenia',
					'Romanian': 'Traduceri',
				},
				pronunciation: {
					'English': 'Pronunciation',
					'Polish': 'Wymowa',
					'Romanian': 'Pronunțare',
				},
				definitions: {
					'English': 'Definitions',
					'Polish': 'Znaczenia',
					'Romanian': 'Definiții',
				},
				etymology: {
					'English': 'Etymology',
					'Polish': 'Etymologia',
					'Romanian': 'Etimologie',
				},
				synonyms: {
					'English': 'Synonyms',
					'Polish': 'Synonimy',
					'Romanian': 'Sinonime',
				},
				antonyms: {
					'English': 'Antonyms',
					'Polish': 'Antonimy',
					'Romanian': 'Antonime',
				},
				expressions: {
					'English': 'Expressions',
					'Polish': 'Zwroty',
					'Romanian': 'Exprimări',
				},
			},
			definitionsOmitted: {
				'English': (results: number) => {
					const numberExpression = Expressions.english.methods.pluralise(
						results.toString(),
						'definition',
						'definitions',
					);
					const flag = localise(this.word.options.verbose.name, getLocaleByLanguage('English'));

					return `Omitted ${numberExpression}. ` +
						`To display more results, enable the ${code(flag)} flag.`;
				},
				'Polish': (results: number) => {
					const numberExpression = Expressions.polish.methods.pluralise(
						results.toString(),
						'znaczenie',
						'znaczenia',
						'znaczeń',
					);
					const flag = localise(this.word.options.verbose.name, getLocaleByLanguage('Polish'));

					return `Ominięto ${numberExpression}. ` +
						`Aby wyświetlić więcej rezultatów, użyj flagi ${code(flag)}.`;
				},
				'Romanian': (results: number) => {
					const numberExpression = Expressions.romanian.methods.pluralise(
						results.toString(),
						'definiție',
						'definiții',
					);
					const flag = localise(this.word.options.verbose.name, getLocaleByLanguage('Romanian'));

					return `Au fost omise ${numberExpression}. ` +
						`Pentru a afișa mai multe rezultate, activează fanionul ${code(flag)}.`;
				},
			},
			page: {
				'English': 'Page',
				'Polish': 'Strona',
				'Romanian': 'Pagina',
			},
			definitions: {
				'English': 'Definitions',
				'Polish': 'Znaczenia',
				'Romanian': 'Definiții',
			},
			inflection: {
				'English': 'Inflection',
				'Polish': 'Odmiana',
				'Romanian': 'Flexiune',
			},
			verbs: {
				moodsAndParticiples: {
					'English': 'Moods and participles',
					'Polish': 'Tryby oraz imiesłowy',
					'Romanian': 'Moduri și participii',
				},
				moods: {
					conditional: {
						'English': 'Conditional',
						'Polish': 'Warunkowy',
						'Romanian': 'Condițional',
					},
					imperative: {
						'English': 'Imperative',
						'Polish': 'Rozkazujący',
						'Romanian': 'Imperativ',
					},
					indicative: {
						'English': 'Indicative',
						'Polish': 'Oznajmujący',
						'Romanian': 'Indicativ',
					},
					infinitive: {
						'English': 'Infinitive',
						'Polish': 'Bezokolicznik',
						'Romanian': 'Infinitiv',
					},
					longInfinitive: {
						'English': 'Long infinitive',
						'Polish': 'Bezokolicznik długi',
						'Romanian': 'Infinitiv lung',
					},
					optative: {
						'English': 'Optative',
						'Polish': 'Życzący',
						'Romanian': 'Optativ',
					},
					presumptive: {
						'English': 'Presumptive',
						'Polish': 'Przypuszczający',
						'Romanian': 'Prezumtiv',
					},
					subjunctive: {
						'English': 'Subjunctive',
						'Polish': 'Łączący',
						'Romanian': 'Conjunctiv',
					},
					supine: {
						'English': 'Supine',
						'Polish': 'Celujący',
						'Romanian': 'Supin',
					},
				},
				participles: {
					present: {
						'English': 'Present participle',
						'Polish': 'Imiesłów przysłówkowy współczesny',
						'Romanian': 'Participiu prezent',
					},
					past: {
						'English': 'Past participle',
						'Polish': 'Imiesłów przymiotnikowy bierny',
						'Romanian': 'Participiu trecut',
					},
				},
				popular: {
					'English': 'popular',
					'Polish': 'popularny',
					'Romanian': 'popular',
				},
				tenses: {
					tenses: {
						'English': 'Tenses',
						'Polish': 'Czasy',
						'Romanian': 'Timpuri',
					},
					present: {
						'English': 'Present',
						'Polish': 'Teraźniejszy',
						'Romanian': 'Prezent',
					},
					presentContinuous: {
						'English': 'Present continuous',
						'Polish': 'Teraźniejszy ciągły',
						'Romanian': 'Prezent continuu',
					},
					imperfect: {
						'English': 'Imperfect',
						'Polish': 'Przeszły niedokonany',
						'Romanian': 'Imperfect',
					},
					preterite: {
						'English': 'Preterite',
						'Polish': 'Przeszły',
						'Romanian': 'Perfect simplu',
					},
					pluperfect: {
						'English': 'Pluperfect',
						'Polish': 'Zaprzeszły',
						'Romanian': 'Mai mult ca perfect',
					},
					perfect: {
						'English': 'Perfect',
						'Polish': 'Dokonany',
						'Romanian': 'Perfect',
					},
					compoundPerfect: {
						'English': 'Compound perfect',
						'Polish': 'Dokonany złożony',
						'Romanian': 'Perfect compus',
					},
					future: {
						'English': 'Future',
						'Polish': 'Przyszły',
						'Romanian': 'Viitor',
					},
					futureCertain: {
						'English': 'Certain future',
						'Polish': 'Przyszły pewny',
						'Romanian': 'Viitor cert',
					},
					futurePlanned: {
						'English': 'Planned future',
						'Polish': 'Przyszły zaplanowany',
						'Romanian': 'Viitor planificat',
					},
					futureDecided: {
						'English': 'Decided future',
						'Polish': 'Przyszły zdecydowany',
						'Romanian': 'Viitor decis',
					},
					futureIntended: {
						'English': 'Intended future',
						'Polish': 'Przyszły zamierzony',
						'Romanian': 'Viitor intenționat',
					},
					futureInThePast: {
						'English': 'Future-in-the-past',
						'Polish': 'Przyszłość w przeszłości',
						'Romanian': 'Viitor în trecut',
					},
					futurePerfect: {
						'English': 'Future perfect',
						'Polish': 'Przyszły dokonany',
						'Romanian': 'Viitor anterior',
					},
				},
			},
			nouns: {
				cases: {
					cases: {
						'English': 'Cases',
						'Polish': 'Przypadki',
						'Romanian': 'Cazuri',
					},
					nominativeAccusative: {
						'English': 'Nominative-accusative',
						'Polish': 'Mianownik-biernik',
						'Romanian': 'Nominativ-acuzativ',
					},
					genitiveDative: {
						'English': 'Genitive-dative',
						'Polish': 'Dopełniacz-celownik',
						'Romanian': 'Genitiv-dativ',
					},
					vocative: {
						'English': 'Vocative',
						'Polish': 'Wołacz',
						'Romanian': 'Vocativ',
					},
				},
				singular: {
					'English': 'Singular',
					'Polish': 'Liczba pojedyncza',
					'Romanian': 'Singular',
				},
				plural: {
					'English': 'Plural',
					'Polish': 'Liczba mnoga',
					'Romanian': 'Plural',
				},
			},
		},
	});

	static readonly list = typedLocalisations({
		name: {
			'English': 'list',
			'Polish': 'spisz',
			'Romanian': 'enumerare',
		},
		description: {
			'English': 'Allows the viewing of various information about users.',
			'Polish': 'Pozwala na wyświetlanie różnych informacji o użytkownikach.',
			'Romanian': 'Permite afișarea diverselor informații despre utilizatori.',
		},
		options: {
			warnings: {
				name: {
					'English': 'warnings',
					'Polish': 'ostrzeżenia',
					'Romanian': 'avertizări',
				},
				description: {
					'English': 'Lists the warnings issued to a user.',
					'Polish': 'Wyświetla ostrzeżenia dane użytkownikowi.',
					'Romanian': 'Afișează avertizările care au fost date unui utilizator.',
				},
			},
		},
		strings: {
			unableToDisplayWarnings: {
				'English': 'The warnings for the given user could not be shown.',
				'Polish': 'Nie udało się wyświetlić ostrzeżeń dla danego użytkownika.',
				'Romanian': 'Avertizările pentru utilizatorul dat nu au putut fi afișate.',
			},
			userDoesNotHaveWarnings: {
				'English': 'This user has not received any warnings.',
				'Polish': 'Ten użytkownik jeszcze nie dostał ostrzeżenia.',
				'Romanian': 'Acest utilizator nu a primit un avertisment încă.',
			},
			warnings: {
				'English': 'Warnings',
				'Polish': 'Ostrzeżenia',
				'Romanian': 'Avertizări',
			},
		},
	});

	static readonly pardon = typedLocalisations({
		name: {
			'English': 'pardon',
			'Polish': 'ułaskaw',
			'Romanian': 'grațiere',
		},
		description: {
			'English': 'Removes the last given warning to a user.',
			'Polish': 'Usuwa ostatnie ostrzeżenie dane użytkownikowi.',
			'Romanian': 'Șterge ultimul avertisment acordat unui utilizator.',
		},
		options: {
			warning: {
				name: {
					'English': 'warning',
					'Polish': 'ostrzeżenie',
					'Romanian': 'avertisment',
				},
				description: {
					'English': 'The warning to remove.',
					'Polish': 'Ostrzeżenie, które ma zostać usunięte.',
					'Romanian': 'Avertismentul care să fie eliminat.',
				},
			},
		},
		strings: {
			failed: {
				'English': 'Failed to remove warning.',
				'Polish': 'Nie udało się usunąć ostrzeżenia.',
				'Romanian': 'Nu s-a putut elimina avertismentul.',
			},
			alreadyRemoved: {
				'English': 'The selected warning has already been removed.',
				'Polish': 'To ostrzeżenie już zostało usunięte.',
				'Romanian': 'Avertismentul selectat a fost deja eliminat.',
			},
			pardoned: {
				'English': (userMention: string, reason: string) =>
					`User ${userMention} has been pardoned from their warning for: ${reason}`,
				'Polish': (userMention: string, reason: string) =>
					`Użytkownik ${userMention} został ułaskawiony z jego ostrzeżenia za: ${reason}`,
				'Romanian': (userMention: string, reason: string) =>
					`Utilizatorul ${userMention} a fost grațiat de avertismentul care i a fost acordat pentru: ${reason}`,
			},
			// Do not localise; this is a public feedback message.
			pardonedDirect: {
				'English': (reason: string, relativeTime: string) =>
					`You have been pardoned from the warning given to you ${relativeTime}.\n\n` +
					`This warning was given to you for: ${reason}`,
			},
		},
	});

	static readonly policy = typedLocalisations({
		name: {
			'English': 'policy',
			'Polish': 'polityka',
			'Romanian': 'politică',
		},
		description: {
			'English': 'Displays the server moderation policy.',
			'Polish': 'Wyświetla politykę moderowania serwera.',
			'Romanian': 'Afișează politica de moderare a serverului.',
		},
	});

	static readonly report = typedLocalisations({
		name: {
			'English': 'report',
			'Polish': 'skarga',
			'Romanian': 'plângere',
		},
		description: {
			'English': 'Allows the user to create a user report.',
			'Polish': 'Umożliwia użytkownikowi złożenie skargi na użytkownika.',
			'Romanian': 'Permite utilizatorului să depună o plângere împotriva unuia sau mai mulți utilizatori.',
		},
		strings: {
			reportSubmitted: {
				// Use exclamation if possible.
				header: {
					'English': 'Report submitted!',
					'Polish': 'Skarga złożona!',
					'Romanian': 'Plângere depusă!',
				},
				body: {
					'English': 'Your report has been submitted. ' +
						'The report will be reviewed by the server staff, but you will not be notified directly about the outcome of a particular report.',
					'Polish': 'Twoja skarga została złożona.' +
						'Moderatorzy serwera przejrzą raport, ale nie zostaniesz bezpośrednio powiadomiony/a o jego skutku.',
					'Romanian': 'Plângerea ta a fost depusă.' +
						'Moderatorii serverului vor analiza raportul, dar nu vei fi informat/ă direct despre rezultatul său.',
				},
			},
			failedToSubmitReport: {
				'English': 'Failed to submit report.',
				'Polish': 'Nie udało się złożyć skargi.',
				'Romanian': 'Nu s-a putut depune plângerea.',
			},
			specifiedUsersIncorrectly: (exampleExpression: string) => ({
				'English': 'You have incorrectly specified which users to report.\n\n' +
					'To identify a user, include their ID or tag. ' +
					//'Alternatively, users can be named directly. ' +
					'User identifiers must be separated using a comma.\n\n' +
					`Example of a valid expression:\n${exampleExpression}`,
				'Polish': 'Niewłaściwie zidentyfikowałeś/aś użytkowników przeciw którym ma być złożona skarga.' +
					'Aby zidentyfikować użytkownika, użyj jego ID lub tagu. ' +
					//'Można wymienić użytkownika także niebezpośrednio, wymieniając jego nazwę użytkownika / nick. ' +
					'Identyfikatory użytkowników muszą być oddzielone za pomocą przecinka.\n\n' +
					`Przykład:\n${exampleExpression}`,
				'Romanian': 'Ai identificat incorect utilizatorii împotriva cărora să fie depusă plângerea.' +
					'Pentru a identifica un utilizator, menționează-i folosindu-i ID-ul sau tag-ul. ' +
					//'De asemenea, se poate menționa utilizatorul indirect folosindu-i numele.\n\n' +
					'Identificările utilizatorilor trebuie să fie separate folosind virgula.' +
					`De exemplu:\n${exampleExpression}`,
			}),
			specifiedUserMoreThanOnce: {
				'English': 'You have specified the same user more than once.\n\n' +
					'Before attempting to submit the report again, make sure each user is only mentioned once in the report.',
				'Polish': 'Zidentyfikowałeś/aś tego samego użytkownika więcej niż jeden raz.\n\n' +
					'Zanim spróbujesz ponownie wysłać skargę, upewnij się, że istnieje tylko jedna wzmianka o każdym pojedynczym użytkowniku.',
				'Romanian': 'Ai identificat același utilizator de mai multe ori.\n\n' +
					'Înainte de a încerca din nou să transmiți plângerea, asigurează-te că fiecare utilizator este menționat doar o singură dată în raport.',
			},
			cannotSubmitReportAgainstSelf: {
				'English': 'You cannot submit a report against yourself.',
				'Polish': 'Nie możesz złożyć skargi przeciw samemu/samej sobie.',
				'Romanian': 'Nu poți depune o plângere împotriva ta.',
			},
			areYouSureToStopSubmitting: {
				'English': 'Are you sure you want to stop submitting the report?',
				'Polish': 'Czy jesteś pewny/a, że chcesz anulować składanie skargi?',
				'Romanian': 'Ești sigur/ă că vrei să anulezi depunerea plângerii?',
			},
			waitBeforeReporting: {
				'English': 'You have already made a few reports recently.\n\n' +
					'You should wait before reporting somebody again.',
				'Polish': 'Zanim ponownie spróbujesz zgłosić użytkownika, powinieneś/powinnaś troszeczkę poczekać.',
				'Romanian': 'Ar trebui să-ți iei puțin timp înainte de a încerca să depui din nou o plângere împotriva cuiva.',
			},
			specifiedTooManyUsers: {
				'English': (limit: number) => {
					const numberExpression = Expressions.english.methods.pluralise(
						limit.toString(),
						'user',
						'users',
					);

					return 'You have tried to report too many users at once. ' +
						`You can only report up to ${numberExpression} at once.`;
				},
				'Polish': (limit: number) => {
					const numberExpression = Expressions.polish.methods.pluralise(
						limit.toString(),
						'użytkownika',
						'użytkowników',
						'użytkowników',
					);

					return 'Próbowałeś/aś zgłosić zbyt wielu użytkowników jednocześnie. ' +
						`Maksymalnie można zgłosić tylko ${numberExpression}.`;
				},
				'Romanian': (limit: number) => {
					const numberExpression = Expressions.romanian.methods.pluralise(
						limit.toString(),
						'utilizator',
						'utilizatori',
					);

					return 'Ai încercat să reporți prea mulți membri în același timp. ' +
						`Poți raporta numai până la ${numberExpression} concomitent.`;
				},
			},
		},
	});

	static readonly rule = typedLocalisations({
		name: {
			'English': 'rule',
			'Polish': 'reguła',
			'Romanian': 'regulă',
		},
		description: {
			'English': 'Cites a server rule.',
			'Polish': 'Cytuje jedną z reguł serwera.',
			'Romanian': 'Citează o regulă din regulament.',
		},
		options: {
			rule: {
				name: {
					'English': 'rule',
					'Polish': 'reguła',
					'Romanian': 'regulă',
				},
				description: {
					'English': 'The rule to cite.',
					'Polish': 'Reguła, która ma być zacytowana.',
					'Romanian': 'Regula care să fie citată.',
				},
			},
		},
		strings: {
			invalidRule: {
				'English': 'Invalid rule.',
				'Polish': 'Nieprawidłowa reguła.',
				'Romanian': 'Regulă invalidă.',
			},
		},
	});

	static readonly timeout = typedLocalisations({
		name: {
			'English': 'timeout',
			'Polish': 'timeout',
			'Romanian': 'timeout',
		},
		description: {
			'English': 'Used to manage user timeouts.',
			'Polish': 'Komenda używana do zarządzania wyciszaniem użytkowników.',
			'Romanian': 'Comandă utilizată pentru gestionarea pauzelor utilizatorilor.',
		},
		options: {
			set: {
				name: {
					'English': 'set',
					'Polish': 'ustaw',
					'Romanian': 'setare',
				},
				description: {
					'English': 'Times out a user, making them unable to interact on the server.',
					'Polish': 'Wycisza użytkownika, uniemożliwiając mu interakcję z serwerem (pisanie, mówienie w VC, itp.).',
					'Romanian': 'Face ca un utilizator să nu mai poată interacționa în server.',
				},
			},
			clear: {
				name: {
					'English': 'clear',
					'Polish': 'usuń',
					'Romanian': 'ștergere',
				},
				description: {
					'English': 'Clears a user\'s timeout.',
					'Polish': 'Umożliwia użytkownikowi, który został wyciszony, ponowną interakcję z serwerem.',
					'Romanian': 'Permite utilizatorului care a primit un timeout să interacționeze cu serverul.',
				},
			},
		},
		strings: {
			cannotTimeoutSelf: {
				'English': 'You cannot time yourself out.',
				'Polish': 'Nie można wyciszyć siebie samego.',
				'Romanian': 'Nu îți poți seta însuți un timeout.',
			},
			invalidDuration: {
				'English': 'The provided duration is invalid.',
				'Polish': 'Określony okres czasu nie jest prawidłowy.',
				'Romanian': 'Durata precizată nu este validă.',
			},
			durationMustBeLongerThanMinute: {
				'English': 'The duration must be longer than a minute.',
				'Polish': 'Wyciszenie musi trwać przynajmniej minutę.',
				'Romanian': 'Pauza trebuie să dureze mai mult decât un minut.',
			},
			durationMustBeShorterThanWeek: {
				'English': 'The duration must not be longer than a week.',
				'Polish': 'Wyciszenie nie może trwać dłużej niż tydzień.',
				'Romanian': 'Pauza nu poate să dureze mai mult decât o săptămână.',
			},
			timedOut: {
				'English': (userMention: string, until: string) =>
					`User ${userMention} has been timed out. ` +
					`The timeout will expire ${until}.`,
				'Polish': (userMention: string, until: string) =>
					`Użytkownik ${userMention} został wyciszony. ` +
					`Wyciszenie wygaśnie ${until}.`,
				'Romanian': (userMention: string, until: string) =>
					`Utilizatorul ${userMention} a primit un timeout. ` +
					`Timeout-ul va expira ${until}.`,
			},
			timedOutWithReason: {
				'English': (userMention: string, until: string, reason: string) =>
					`User ${userMention} has been timed out for: ${reason}\n\n` +
					`The timeout will expire ${until}`,
				'Polish': (userMention: string, until: string, reason: string) =>
					`Użytkownik ${userMention} został wyciszony za: ${reason}\n\n` +
					`Wyciszenie wygaśnie ${until}.`,
				'Romanian': (userMention: string, until: string, reason: string) =>
					`Utilizatorul ${userMention} a primit un timeout pentru: ${reason}\n\n` +
					`Timeout-ul va expira ${until}.`,
			},
			// Do not localise; this is a public feedback message.
			timedOutDirect: {
				'English': (until: string, reason: string) =>
					`You have been timed out for: ${reason}\n\n` +
					`The timeout will expire ${until}.`,
			},
			notTimedOut: {
				'English': 'The provided user is not currently timed out.',
				'Polish': 'Ten użytkownik nie jest wyciszony.',
				'Romanian': 'Acest utilizator nu a avut un timeout impus pe el.',
			},
			timeoutCleared: {
				'English': (userMention: string) => `User ${userMention} is no longer timed out.`,
				'Polish': (userMention: string) => `Użytkownik ${userMention} już nie jest wyciszony.`,
				'Romanian': (userMention: string) => `Utilizatorul ${userMention} nu mai are un timeout.`,
			},
			// Do not localise; this is a public feedback message.
			timeoutClearedDirect: {
				'English': 'Your timeout has been cleared.',
			},
		},
	});

	static readonly warn = typedLocalisations({
		name: {
			'English': 'warn',
			'Polish': 'ostrzeż',
			'Romanian': 'avertizare',
		},
		description: {
			'English': 'Warns a user.',
			'Polish': 'Ostrzega użytkownika.',
			'Romanian': 'Avertizează un utilizator.',
		},
		strings: {
			cannotWarnSelf: {
				'English': 'You cannot warn yourself.',
				'Polish': 'Nie można ostrzec siebie samego.',
				'Romanian': 'Nu te poți avertiza pe tine însuți.',
			},
			cannotWarnCertainUsers: {
				'English': 'Neither bots nor server moderators can be warned.',
				'Polish': 'Nie można ostrzegać ani botów, ani moderatorów serwera.',
				'Romanian': 'Nu se pot avertiza nici boții, nici moderatorii de server.',
			},
			failed: {
				'English': 'Failed to warn user.',
				'Polish': 'Nie udało się ostrzec użytkownika.',
				'Romanian': 'Nu s-a putut avertiza utilizatorul.',
			},
			warned: {
				'English': (userMention: string, warningCount: number) =>
					`User ${userMention} has been warned. ` +
					`They now have ${warningCount} warnings.`,
				'Polish': (userMention: string, warningCount: number) =>
					`Użytkownik ${userMention} został ostrzeżony. ` +
					`Razem ostrzeżeń: ${warningCount}.`,
				'Romanian': (userMention: string, warningCount: number) =>
					`Utilizatorul ${userMention} a fost avertizat. ` +
					`Avertizări în total: ${warningCount}.`,
			},
			// Do not localise; this is a public feedback message.
			reachedKickStage: {
				'English': (reason: string) =>
					`You have been warned for: ${reason}\n\n` +
					'You have surpassed the maximum number of warnings, and have subsequently been kicked from the server.',
			},
			// Do not localise; this is a public feedback message.
			reachedBanStage: {
				'English': (reason: string) =>
					`You have been warned for: ${reason}\n\n` +
					'You have surpassed the maximum number of warnings twice, and have subsequently been permanently banned from the server.',
			},
			// Do not localise; this is a public feedback message.
			warnedDirect: {
				'English': (
					reason: string,
					warningCount: number,
					warningLimit: number,
				) =>
					`You have been warned for: ${reason}\n\n` +
					`This is warning no. ${warningCount} of ${warningLimit}.`,
			},
		},
	});

	static readonly music = typedLocalisations({
		name: {
			'English': 'music',
			'Polish': 'muzyka',
			'Romanian': 'muzică',
		},
		description: {
			'English': 'Allows the user to manage music playback in a voice channel.',
			'Polish': 'Pozwala użytkownikowi na zarządanie odtwarzaniem muzyki w kanale głosowym.',
			'Romanian': 'Permite utilizatorului gestionarea redării muzicii într-un canal de voce.',
		},
		options: {
			forward: {
				name: {
					'English': 'forward',
					'Polish': 'przewiń-do-przodu',
					'Romanian': 'derulare-înainte',
				},
				description: {
					'English': 'Fast-forwards the currently playing song.',
					'Polish': 'Przewija obecnie grający utwór do przodu.',
					'Romanian': 'Derulează melodia în curs de redare înainte.',
				},
			},
			history: {
				name: {
					'English': 'history',
					'Polish': 'historia',
					'Romanian': 'istorie',
				},
				description: {
					'English': 'Displays a list of previously played songs.',
					'Polish': 'Wyświetla listę zagranych piosenek.',
					'Romanian': 'Afișează lista tututor melodiilor redate.',
				},
				strings: {
					playbackHistory: {
						'English': 'Playback history',
						'Polish': 'Historia odtwarzania',
						'Romanian': 'Istoricul redării',
					},
				},
			},
			now: {
				name: {
					'English': 'now',
					'Polish': 'teraz',
					'Romanian': 'acum',
				},
				description: {
					'English': 'Displays the currently playing song.',
					'Polish': 'Wyświetla obecnie odtwarzany utwór lub zbiór utworów.',
					'Romanian': 'Afișează melodia sau setul de melodii în curs de redare.',
				},
				strings: {
					noSongPlaying: {
						'English': 'There is no song to display the details of.',
						'Polish': 'Nie można wyświetlić informacji o utworze, ponieważ żaden utwór obecnie nie jest odtwarzany.',
						'Romanian': 'Nu s-au putut afișa informații despre melodie fiindcă în prezent nu se redă nicio melodie.',
					},
					noCollectionPlaying: {
						'English': 'There is no song collection to show the details of.\n\n' +
							'Try requesting information about the current song instead.',
						'Polish':
							'Nie można wyświetlić informacji o zbiorze utworów, ponieważ żaden zbiór utworów obecnie nie jest odtwarzany.\n\n' +
							'Spróbuj wysłać prośbę o wyświetlenie informacji o samym utworze.',
						'Romanian':
							'Nu s-au putut afișa informații despre melodie fiindcă în prezent nu se redă niciun set de melodii.\n\n' +
							'Încearcă să trimiți o cerere de informații despre melodia actuală.',
					},
					nowPlaying: {
						'English': 'Now playing',
						'Polish': 'Teraz odtwarzane',
						'Romanian': 'În curs de redare',
					},
					songs: {
						'English': 'Songs',
						'Polish': 'Utwory',
						'Romanian': 'Melodii',
					},
					collection: {
						'English': 'Collection',
						'Polish': 'Zbiór',
						'Romanian': 'Set',
					},
					track: {
						'English': 'Track',
						'Polish': 'Track',
						'Romanian': 'Track',
					},
					title: {
						'English': 'Title',
						'Polish': 'Tytuł',
						'Romanian': 'Titlu',
					},
					requestedBy: {
						'English': 'Requested by',
						'Polish': 'Na prośbę',
						'Romanian': 'Conform cererii',
					},
					runningTime: {
						'English': 'Running time',
						'Polish': 'Czas odtwarzania',
						'Romanian': 'Perioadă de redare',
					},
					playingSince: {
						'English': (timestamp: string) => `Since ${timestamp}.`,
						'Polish': (timestamp: string) => `Od ${timestamp}.`,
						'Romanian': (timestamp: string) => `De la ${timestamp}.`,
					},
					startTimeUnknown: {
						'English': 'Start time unknown.',
						'Polish': 'Czas rozpoczęcia odtwarzania nieznany.',
						'Romanian': 'Oră de început a redării necunoscută.',
					},
					sourcedFrom: {
						'English': (origin: string) => `This listing was sourced from ${origin}.`,
						'Polish': (origin: string) => `Ten wpis został pobrany z ${origin}.`,
						'Romanian': (origin: string) => `Această înregistrare a fost furnizată de pe ${origin}.`,
					},
					// This string fits with the above ones. 'This listing was sourced from __the internet__'.
					theInternet: {
						'English': 'the internet',
						'Polish': 'internetu',
						'Romanian': 'internet',
					},
				},
			},
			pause: {
				name: {
					'English': 'pause',
					'Polish': 'zapauzuj',
					'Romanian': 'pauzare',
				},
				description: {
					'English': 'Pauses the currently playing song or song collection.',
					'Polish': 'Zapauzuj obecny utwór lub zbiór utworów.',
					'Romanian': 'Pauzează melodia sau setul de melodii în curs de redare.',
				},
				strings: {
					noSongToPause: {
						'English': 'There is no song to pause.',
						'Polish': 'Nie ma utworu do zapauzowania.',
						'Romanian': 'Nu este o melodie pentru a o pauza.',
					},
					paused: {
						header: { 'English': 'Paused' },
						body: { 'English': 'Paused the playback of music.' },
					},
				},
			},
			play: {
				name: {
					'English': 'play',
					'Polish': 'odtwórz',
					'Romanian': 'redare',
				},
				description: {
					'English': 'Allows the user to play music in a voice channel.',
					'Polish': 'Pozwala użytkownikowi na odtwarzanie muzyki w kanale głosowym.',
					'Romanian': 'Permite utilizatorului să redea muzică într-un canal de voce.',
				},
				options: {
					file: {
						name: {
							'English': 'file',
							'Polish': 'plik',
							'Romanian': 'fișier',
						},
						description: {
							'English': 'Plays an external audio file.',
							'Polish': 'Odtwarza muzykę w kształcie zewnętrznego pliku audio.',
							'Romanian': 'Redă muzică în forma unui fișier audio extern.',
						},
						options: {
							url: {
								name: {
									'English': 'url',
									'Polish': 'url',
									'Romanian': 'url',
								},
								description: {
									'English': 'Link to the audio file.',
									'Polish': 'Link do pliku audio.',
									'Romanian': 'Linkul către fișier audio.',
								},
							},
						},
					},
					source: (name: string) => ({
						name: { 'English': name.toLowerCase() },
						description: {
							'English': `Plays a song from ${name}.`,
							'Polish': `Odtwarza utwór dostępny na ${name}.`,
							'Romanian': `Redă o melodie disponibilă pe ${name}.`,
						},
					}),
				},
				strings: {
					externalFile: {
						'English': 'External file',
						'Polish': 'Zewnętrzny plik',
						'Romanian': 'Fișier extern',
					},
					songNotFound: {
						'English': 'Couldn\'t find the requested song.\n\n' +
							'You could try an alternative search, or request a different song.',
						'Polish': 'Nie udało się znaleźć utworu.\n\n' +
							'Spróbuj wyszukać utworu w inny sposób, lub odtworzyć inny otwór.',
						'Romanian': 'Nu s-a putut găsi melodia.\n\n' +
							'Încearcă să cauți melodia într-un mod diferit, sau să redai o altă melodie.',
					},
					mustBeInVoiceChannel: {
						'English': 'To manipulate music, you must be in a voice channel.',
					},
					alreadyPlayingInAnotherVoiceChannel: {
						'English': 'The bot is playing music in another voice channel.',
					},
					queueIsFull: {
						'English':
							'The queue is full; Try removing a song from the song queue, skip the current song to advance the queue immediately, or wait until the current song stops playing.',
					},
					queued: {
						header: {
							'English': 'Listing queued',
						},
						body: {
							'English': (listingTitle: string) => `Your listing, **${listingTitle}**, has been added to the queue.`,
						},
					},
				},
			},
			queue: {
				name: {
					'English': 'queue',
					'Polish': 'kolejka',
					'Romanian': 'coadă',
				},
				description: {
					'English': 'Displays a list of queued song listings.',
					'Polish': 'Wyświetla listę utworów oraz zbiorów utworów w kolejce.',
					'Romanian': 'Afișează lista cu melodii și seturi de melodii în coadă.',
				},
				strings: {
					queue: {
						'English': 'Queue',
						'Polish': 'Kolejka',
						'Romanian': 'Coadă',
					},
				},
			},
			remove: {
				name: {
					'English': 'remove',
					'Polish': 'usuń',
					'Romanian': 'ștergere',
				},
				description: {
					'English': 'Removes a song listing from the queue.',
					'Polish': 'Usuwa wpis z kolejki muzycznej.',
					'Romanian': 'Șterge o înregistrare din coadă.',
				},
				strings: {
					noListingToRemove: {
						'English': 'There are no songs in the queue.',
						'Polish': 'Nie ma utworów w kolejce.',
						'Romanian': 'Nu sunt melodii în coadă.',
					},
					selectSongToRemove: {
						'English': 'Select a song or song collection to remove from the choices below.',
						'Polish': 'Wybierz utwór lub zbiór utworów do usunięcia poniżej.',
						'Romanian': 'Alege o melodie sau un set de melodii de șters mai jos.',
					},
					// Use ellipsis if appropriate.
					continuedOnTheNextPage: {
						'English': 'Continued on the next page...',
						'Polish': 'Kontynuacja na następnej stronie...',
						'Romanian': 'Continuare pe următoarea pagină...',
					},
					failedToRemoveSong: {
						'English': 'Failed to remove the selected song.',
						'Polish': 'Nie udało się usunąć zaznaczonego utworu.',
						'Romanian': 'Nu s-a putut elimina melodia selectată.',
					},
					removed: {
						header: { 'English': 'Removed' },
						body: {
							'English': (songTitle: string, userMention: string) =>
								`The song **${songTitle}** has been removed by ${userMention}.`,
						},
					},
				},
			},
			replay: {
				name: {
					'English': 'replay',
					'Polish': 'powtórz',
					'Romanian': 'reluare',
				},
				description: {
					'English': 'Begins playing the currently playing song from the start.',
					'Polish': 'Odtwarza obecnie grający utwór od początku.',
					'Romanian': 'Redă melodia în curs de redare din nou.',
				},
				strings: {
					noSongToReplay: {
						'English': 'There is no song to replay.',
						'Polish': 'Nie ma utworu do ponownego odtworzenia.',
						'Romanian': 'Nu este o melodie de redat din nou.',
					},
					noSongCollectionToReplay: {
						'English': 'There is no song collection to replay.\n\n' +
							'Try replaying the current song instead.',
						'Polish': 'Nie ma zbioru utworów do ponownego odtworzenia.\n\n' +
							'Spróbuj odtworzyć ponownie sam utwór.',
						'Romanian': 'Nu este un set de melodii de redat din nou.\n\n' +
							'Încearcă să redai din nou melodia actuală.',
					},
				},
			},
			resume: {
				name: {
					'English': 'resume',
					'Polish': 'wznów',
					'Romanian': 'continuare',
				},
				description: {
					'English': 'Unpauses the currently playing song if it is paused.',
					'Polish': 'Wznawia odtwarzanie obecnie grającego utworu, jeśli ten jest zapauzowany.',
					'Romanian': 'Anulează întreruperea redării melodiei actuale dacă aceasta este în pauză.',
				},
				strings: {
					noSongToResume: {
						'English': 'There is no song to resume the playing of.',
						'Polish': 'Nie ma piosenki do wznowienia odtwarzania.',
						'Romanian': 'Nu este o melodie pentru a-i relua redarea.',
					},
					notCurrentlyPaused: {
						'English': 'The current song is not paused.',
						'Polish': 'Obecny utwór nie jest zatrzymany.',
						'Romanian': 'Melodia actuală nu este oprită.',
					},
					resumed: {
						header: { 'English': 'Resumed' },
						body: { 'English': 'Music playback has been resumed.' },
					},
				},
			},
			rewind: {
				name: {
					'English': 'rewind',
					'Polish': 'przewiń-do-tyłu',
					'Romanian': 'derulare-înapoi',
				},
				description: {
					'English': 'Rewinds the currently playing song.',
					'Polish': 'Przewija obecnie grający utwór do tyłu.',
					'Romanian': 'Derulează melodia în curs de redare înapoi.',
				},
			},
			skip: {
				name: {
					'English': 'skip',
					'Polish': 'przewiń',
					'Romanian': 'sărire-peste',
				},
				description: {
					'English': 'Skips the currently playing song.',
					'Polish': 'Przewija obecnie grający utwór.',
					'Romanian': 'Sare peste melodia în curs de redare.',
				},
				strings: {
					noSongToSkip: {
						'English': 'There is no song to skip.',
						'Polish': 'Nie ma utworu do przewinięcia.',
						'Romanian': 'Nu este o melodie de sărit peste.',
					},
					noSongCollectionToSkip: {
						'English': 'There is no song collection to skip.\n\n' +
							'Try skipping the current song instead.',
						'Polish': 'Nie ma zbioru utworów do przewinięcia.\n\n' +
							'Spróbuj przewinąć sam utwór.',
						'Romanian': 'Nu este un set de melodii de sărit peste.\n\n' +
							'Încearcă să sari peste melodia actuală.',
					},
					skippedSong: {
						header: { 'English': 'Skipped' },
						body: { 'English': 'The song has been skipped.' },
					},
					skippedSongCollection: {
						header: { 'English': 'Skipped' },
						body: { 'English': 'The song collection has been skipped.' },
					},
				},
			},
			stop: {
				name: {
					'English': 'stop',
					'Polish': 'przerwij',
					'Romanian': 'oprire',
				},
				description: {
					'English': 'Stops the current listening session, clearing the queue and song history.',
					'Polish': 'Przerywa obecną sesję słuchania muzyki.',
					'Romanian': 'Oprește sesiunea actuală de ascultare.',
				},
				strings: {
					notPlayingMusic: {
						'English': 'The bot is currently not playing music.',
						'Polish': 'Bot obecnie nie odtwarza muzyki.',
						'Romanian': 'Nu se redă muzică.',
					},
					stopped: {
						header: { 'English': 'Stopped' },
						body: {
							'English': 'The listening session has been stopped, and the song queue and history have been cleared.',
						},
					},
				},
			},
			unskip: {
				name: {
					'English': 'unskip',
					'Polish': 'przywróć',
					'Romanian': 'înapoiare',
				},
				description: {
					'English': 'Brings back the last played song.',
					'Polish': 'Przywraca ostatnio zagrany utwór lub zbiór utworów.',
					'Romanian': 'Înapoiază ultima melodie sau ultimul set de melodii redat.',
				},
				strings: {
					nowhereToUnskipTo: {
						'English': 'There is nowhere to unskip to.',
						'Polish': 'Nie ma dokąd przewinąć spowrotem.',
						'Romanian': 'Nu este încotro a sări peste.',
					},
					noSongCollectionToUnskip: {
						'English': 'There is no song collection to unskip.\n\n' +
							'Try unskipping the current song instead.',
						'Polish': 'Nie ma zbioru utworów do przewinięcia.\n\n' +
							'Spróbuj przewinąć sam utwór.',
						'Romanian': 'Nu este un set de melodii de sărit peste.\n\n' +
							'Încearcă să sari peste melodia actuală.',
					},
					cannotUnskipDueToFullQueue: {
						'English': 'The last played song listing cannot be unskipped because the song queue is already full.',
						'Polish': 'Ostatnio odtworzony wpis nie może zostać przywrócony, ponieważ kolejka jest pełna.',
						'Romanian': 'Ultima înregistrare nu poate fi înapoiată fiindcă coada deja este plină.',
					},
					unskipped: {
						header: { 'English': 'Unskipped' },
						body: {
							'English': 'The last played song listing has been brought back.',
						},
					},
				},
			},
			volume: {
				name: {
					'English': 'volume',
					'Polish': 'głośność',
					'Romanian': 'volum',
				},
				description: {
					'English': 'Allows the user to manage the volume of music playback.',
					'Polish': 'Pozwala użytkownikowi na zarządzanie głośnością odtwarzania muzyki.',
					'Romanian': 'Permite utilizatorului gestionarea volumului redării muzicii.',
				},
				options: {
					display: {
						name: {
							'English': 'display',
							'Polish': 'wyświetl',
							'Romanian': 'afișare',
						},
						description: {
							'English': 'Displays the volume of playback.',
							'Polish': 'Wyświetla głośność odtwarzania.',
							'Romanian': 'Afișează volumul redării.',
						},
						strings: {
							volume: {
								header: {
									'English': 'Volume',
									'Polish': 'Głośność',
									'Romanian': 'Volum',
								},
								body: {
									'English': (volume: number) => `The current volume is ${volume}%.`,
									'Polish': (volume: number) => `Obecna głośność to ${volume}%.`,
									'Romanian': (volume: number) => `Volumul actual este ${volume}%.`,
								},
							},
						},
					},
					set: {
						name: {
							'English': 'set',
							'Polish': 'ustaw',
							'Romanian': 'setare',
						},
						description: {
							'English': 'Sets the volume of playback.',
							'Polish': 'Ustawia głośność odtwarzania.',
							'Romanian': 'Setează volumul redării.',
						},
						options: {
							volume: (maxVolume: number) => ({
								name: {
									'English': 'volume',
									'Polish': 'głośność',
									'Romanian': 'volum',
								},
								description: {
									'English': `A number between 0 and ${maxVolume}.`,
									'Polish': `Liczba między 0 i ${maxVolume}.`,
									'Romanian': `Un număr între 0 și ${maxVolume}.`,
								},
							}),
						},
						strings: {
							invalidVolume: {
								'English': (maxVolume: number) =>
									`Song volume may not be negative, and it may not be higher than ${maxVolume}%.`,
								'Polish': (maxVolume: number) =>
									`Głośność musi być większa niż zero, oraz nie większa niż ${maxVolume}%.`,
								'Romanian': (maxVolume: number) =>
									`Volumul trebuie să fie mai mare decât zero, dar și nu mai mare decât ${maxVolume}%.`,
							},
							volumeSet: {
								header: { 'English': 'Volume set' },
								body: {
									'English': (volume: number) => `The volume has been set to ${volume}%.`,
								},
							},
						},
					},
				},
			},
		},
		strings: {
			listings: {
				'English': 'Listings',
				'Polish': 'Wpisy',
				'Romanian': 'Înregistrări',
			},
			listEmpty: {
				'English': 'This list is empty.',
				'Polish': 'Ta lista jest pusta.',
				'Romanian': 'Această listă este goală.',
			},
			tooManySkipArguments: {
				'English': 'You may not skip __by__ a number of songs and skip __to__ a certain song in the same query.',
				'Polish': 'Nie można przewijać zarazem __o__ liczbę utworów i __do__ danego utworu w tym samym czasie.',
				'Romanian':
					'Nu se poate sări __peste__ un anumit număr de melodii și __către__ o anumită melodie în același timp.',
			},
			mustBeGreaterThanZero: {
				'English': 'The skip argument must be greater than zero.',
				'Polish': 'Argument przewinięcia musi być większy niż zero.',
				'Romanian': 'Argumentul trebuie să fie mai mare decât zero.',
			},
			allDone: {
				header: {
					'English': 'All done!',
				},
				body: {
					'English': 'Can I go home for today?',
				},
			},
			couldNotLoadTrack: {
				header: {
					'English': 'Couldn\'t load track',
				},
				body: {
					'English': (songTitle: string) => `The track, **${songTitle}**, could not be loaded.`,
				},
			},
			playing: {
				header: {
					'English': 'Now playing',
				},
				body: {
					'English': (displayTrack: string, songTitle: string, songUrl: string, userMention: string) =>
						`Now playing ${displayTrack} [**${songTitle}**](${songUrl}) as requested by ${userMention}.`,
				},
				parts: {
					displayTrack: {
						'English': (position: number, songCount: number, listingTitle: string) =>
							`track **${position}/${songCount}** of **${listingTitle}**: `,
					},
				},
			},
			type: {
				song: {
					'English': 'Song',
				},
				songCollection: {
					'English': 'Song Collection',
				},
				external: {
					'English': 'External',
				},
			},
		},
	});

	static readonly suggest = typedLocalisations({
		name: {
			'English': 'suggest',
			'Polish': 'zasugeruj',
			'Romanian': 'sugerează',
		},
		description: {
			'English': 'Passes a suggestion over to the server staff.',
			'Polish': 'Przekazuje sugestię moderacji serwera.',
			'Romanian': 'Transmite o sugestie personalului serverului.',
		},
		options: {
			suggestion: {
				name: {
					'English': 'suggestion',
					'Polish': 'sugestia',
					'Romanian': 'sugestie',
				},
				description: {
					'English': 'The suggestion to pass over to the server staff.',
					'Polish': 'Sugestia, która ma zostać przekazana moderacji serwera.',
					'Romanian': 'Sugestia care să fie transmisă personalului serverului.',
				},
			},
		},
		strings: {
			// Do not localise; this is a public feedback message.
			suggestionReceived: {
				header: {
					'English': 'Suggestion!',
				},
				body: {
					'English': (userMention: string, suggestion: string) =>
						`${userMention} has made a suggestion.\n\n` + `Suggestion: *${suggestion}*`,
				},
			},
			suggestionMade: {
				'English': 'Your suggestion has been passed over to the server staff.\n\n' +
					'We will keep you posted for developments regarding it.',
				'Polish': 'Twoja sugestia została przekazana moderacji serwera.\n\n' +
					'Będziemy na bieżąco informować Cię o zmianach w jej zakresie.',
				'Romanian': 'Sugestia ta a fost transmisă personalului serverului.\n\n' +
					'Te vom ține la curent cu evoluțiile din cadrul acesteia.',
			},
		},
	});

	static readonly praise = typedLocalisations({
		name: {
			'English': 'praise',
			'Polish': 'pochwal',
			'Romanian': 'lăudare',
		},
		description: {
			'English': 'Praises a user for their contribution.',
			'Polish': 'Chwali użytkownika za jego wkład.',
			'Romanian': 'Laudă un utilizator pentru contribuțiile sale.',
		},
		options: {
			comment: {
				name: {
					'English': 'comment',
					'Polish': 'komentarz',
					'Romanian': 'comentariu',
				},
				description: {
					'English': 'A comment to attach to the praise.',
					'Polish': 'Komentarz, który ma zostać załączony do pochwały.',
					'Romanian': 'Comentariul care să fie atașat la laudă.',
				},
				type: ApplicationCommandOptionTypes.String,
			},
		},
		strings: {
			cannotPraiseSelf: {
				'English': 'You cannot praise yourself.',
				'Polish': 'Nie możesz pochwalić samego siebie.',
				'Romanian': 'Nu te poți lăuda pe tine însuți/însăți.',
			},
			failed: {
				'English': 'Failed to praise user.',
				'Polish': 'Nie udało się pochwalić użytkownika.',
				'Romanian': 'Nu s-a putut lăuda utilizatorul.',
			},
			waitBeforePraising: {
				'English': 'You have already praised a user recently. You must wait before praising somebody again.',
				'Polish': 'Zanim ponownie spróbujesz pochwalić użytkownika, powinieneś/powinnaś troszeczkę poczekać.',
				'Romanian': 'Ar trebui să-ți iei puțin timp înainte de a încerca să lauzi din nou un utilizator.',
			},
			praised: {
				'English': (userMention: string) =>
					`Unless ${userMention} has their DMs closed, they have just been notified that you have praised them.`,
				'Polish': (userMention: string) =>
					`Jeśli ${userMention} nie zablokował swoich DM-ów, właśnie został/a powiadomiony/a o pochwale.`,
				'Romanian': (userMention: string) =>
					`Cu excepția că ${userMention} și-a blocat DM-urile sale, tocmai ce a fost notificat că l-ai lăudat.`,
			},
			praisedDirect: {
				'English': (userMention: string) => `You have just been praised by ${userMention}!`,
				'Polish': (userMention: string) => `Użytkownik ${userMention} właśnie Cię pochwalił!`,
				'Romanian': (userMention: string) => `Abia ce ai primit o laudă de la ${userMention}!`,
			},
		},
	});

	static readonly profile = typedLocalisations({
		name: {
			'English': 'profile',
			'Polish': 'profil',
			'Romanian': 'profil',
		},
		description: {
			'English': 'Allows the user to view information about themselves or another user.',
			'Polish': 'Pozwala użytkownikowi na wyświetlanie informacji o sobie lub o innych użytkownikach.',
			'Romanian': 'Permite utilizatorului afișarea informațiilor despre sine sau despre alți utilizatori.',
		},
		options: {
			roles: {
				name: {
					'English': 'roles',
					'Polish': 'role',
					'Romanian': 'roluri',
				},
				description: {
					'English': 'Opens the role selection menu.',
					'Polish': 'Otwiera menu wybierania ról.',
					'Romanian': 'Deschide meniul selectării rolurilor.',
				},
				strings: {
					selectCategory: {
						header: {
							'English': 'No category selected',
							'Polish': 'Nie wybrano kategorii',
							'Romanian': 'Nicio categorie selectată',
						},
						body: {
							'English': 'Select a category to obtain the list of available roles for it.',
							'Polish': 'Wybierz kategorię, aby otrzymać listę dostępnych dla niej ról.',
							'Romanian': 'Selectează o categorie pentru a primi lista cu rolurile disponibile pentru aceasta.',
						},
					},
					reachedLimit: {
						'English': (categoryName: string) =>
							`You have reached the limit of roles you can assign from within the '${categoryName}' category.` +
							'To choose a new role, unassign one of your existing roles.',
						'Polish': (categoryName: string) =>
							`Dosięgnąłeś/as limitu ról które mogłeś uzyskać z kategorii '${categoryName}'.` +
							'Aby wybrać rolę inną od tych, które już masz, usuń jedną z istniejących ról.',
						'Romanian': (categoryName: string) =>
							`Ai atins limita rolurilor pe care le poți obține din cadrul categoriei '${categoryName}'.` +
							'Pentru a alege un rol nou, dezasociază unul dintre rolurile existente.',
					},
					chooseCategory: {
						'English': 'Choose a category.',
						'Polish': 'Wybierz kategorię.',
						'Romanian': 'Alege o categorie.',
					},
					chooseRole: {
						'English': 'Choose a role.',
						'Polish': 'Wybierz rolę.',
						'Romanian': 'Alege un rol.',
					},
					back: {
						'English': 'Back',
						'Polish': 'Wstecz',
						'Romanian': 'Înapoi',
					},
					assigned: {
						'English': 'Assigned',
						'Polish': 'Przydzielono',
						'Romanian': 'Atribuit',
					},
				},
			},
			view: {
				name: {
					'English': 'view',
					'Polish': 'wyświetl',
					'Romanian': 'afișare',
				},
				description: {
					'English': 'Displays a user\'s profile.',
					'Polish': 'Wyświetla profil użytkownika.',
					'Romanian': 'Afișează profilul unui utilizator.',
				},
				strings: {
					failed: {
						'English': 'Failed to show information about the chosen member.',
						'Polish': 'Nie udało się wyświetlić informacji o danym członku.',
						'Romanian': 'Nu s-au putut afișa informații despre membrul dat.',
					},
					informationForUser: {
						'English': (username: string) => `Information about ${username}`,
						'Polish': (username: string) => `Informacje o użytkowniku ${username}`,
						'Romanian': (username: string) => `Informații despre ${username}`,
					},
					roles: {
						'English': 'Roles',
						'Polish': 'Role',
						'Romanian': 'Roluri',
					},
					dates: {
						'English': 'Dates',
						'Polish': 'Dat',
						'Romanian': 'Date',
					},
					statistics: {
						'English': 'Statistics',
						'Polish': 'Statystyki',
						'Romanian': 'Statistici',
					},
					received: {
						'English': 'Received',
						'Polish': 'Otrzymano',
						'Romanian': 'Primite',
					},
					sent: {
						'English': 'Sent',
						'Polish': 'Wysłano',
						'Romanian': 'Trimise',
					},
					praises: {
						'English': 'Praises',
						'Polish': 'Pochwały',
						'Romanian': 'Lăudări',
					},
					warnings: {
						'English': 'Warnings',
						'Polish': 'Ostrzeżenia',
						'Romanian': 'Avertizări',
					},
				},
			},
		},
	});
}

export { Commands };
