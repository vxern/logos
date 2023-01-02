import { ApplicationCommandOptionTypes } from 'discordeno';
import { Expressions } from 'logos/assets/localisations/expressions.ts';
import {
	getLocaleForLanguage,
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
			'Hungarian': 'információ',
			'Romanian': 'informații',
		},
		description: {
			'English': 'Used to display various information.',
			'Hungarian': 'Különféle információk megjelenítésére szolgál.',
			'Polish': 'Komenda używania do wyświetlania różnych informacji.',
			'Romanian': 'Comandă utilizată pentru afișarea diverselor informații.',
		},
		options: {
			bot: {
				name: {
					'English': 'bot',
					'Hungarian': 'bot',
					'Polish': 'bot',
					'Romanian': 'bot',
				},
				description: {
					'English': 'Displays information about the bot.',
					'Hungarian': 'A botról jelenít meg információt.',
					'Polish': 'Wyświetla informacje o bocie.',
					'Romanian': 'Afișează informații despre bot.',
				},
				strings: {
					whoAmI: {
						header: {
							'English': 'Who am I?',
							'Hungarian': 'Ki vagyok?',
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
							'Hungarian': (botUsername: string) =>
								`**${botUsername}** vagyok - egy alkalmazás, ami arra készült, hogy nyelvtanuló szerverek számára kiváló minőségű funkciókat biztosítson, mint például:
                ${
									list([
										'🫂 Szociális interakciók kavalkádja',
										'💼 Intuitív rangkezelés',
										'📚 Fordítás és morfémaelemzés',
										'🎶 Zenelejátszás',
										'📜 Cikkek létrehozása, olvasása',
										'🔁 Szerverstruktúra szinkronizálása',
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
							'Hungarian': 'Hogy készültem?',
							'Polish': 'Jak mnie stworzono?',
							'Romanian': 'Cum am fost creat?',
						},
						body: (typescript: string, deno: string, discordApiLink: string, discordeno: string) => ({
							'English': `I am powered by ${typescript} running within ${deno}. ` +
								`I interact with [Discord\'s API](${discordApiLink}) with the help of the ${discordeno} library.`,
							'Hungarian':
								`Működésemet a ${typescript} programozási nyelv és a ${deno} futtatókörnyezet teszi lehetővé. ` +
								`[A Discord API-jával](${discordApiLink}) a ${discordeno} könyvtár segítségével kommunikálok.`,
							'Polish': `Jestem zasilany przez ${typescript}, działający w ramach ${deno}. ` +
								`Współdziałam z [API Discorda](${discordApiLink}) za pomocą biblioteki ${discordeno}.`,
							'Romanian': `Sunt alimentat de către ${typescript}, care se execută în cadrul ${deno}. ` +
								`Interacționez cu [API-ul Discord-ului](${discordApiLink}) cu ajutorul bibliotecii ${discordeno}.`,
						}),
					},
					howToAddToServer: {
						header: {
							'English': 'How can you add me to your server?',
							'Hungarian': 'Hogy tudsz felvenni a szerveredre?',
							'Polish': 'Jak można dodać mnie na własny serwer?',
							'Romanian': 'Cum poți să mă adaugi pe serverul tău?',
						},
						body: (learnArmenian: string, learnRomanian: string) => ({
							'English': `It is not possible at this point in time. ` +
								`I was made for the purpose of managing a select few language-learning communities, such as ${learnArmenian} and ${learnRomanian}.`,
							'Hungarian': `Ez jelenleg nem lehetséges. ` +
								`Néhány meghatározott nyelvtanuló közösség kezelésére készültem, mint például a ${learnArmenian} és a ${learnRomanian}.`,
							'Polish': `Na chwilę obecną nie można tego zrobić. ` +
								`Zostałem stworzony w celu zarządzania kilkoma wybranymi społecznościami językowymi, takimi jak ${learnArmenian} oraz ${learnRomanian}.`,
							'Romanian': `La acest moment asta nu este posibil. ` +
								`Am fost creat cu scopul de a nu gestiona decât câteva comunități lingvistice selecte, cum ar fi ${learnArmenian} și ${learnRomanian}.`,
						}),
					},
					amIOpenSource: {
						header: {
							'English': 'Am I open-source?',
							'Hungarian': 'Nyílt forráskódú vagyok?',
							'Polish': 'Czy mój kod źródłowy jest publiczny?',
							'Romanian': 'Sunt open-source?',
						},
						body: {
							'English': (talonRepositoryLink: string) =>
								`Unfortunately, no. ` +
								`However, my predecessor, Talon, *is*. ` +
								`You can view his source code [here](${talonRepositoryLink}).`,
							'Hungarian': (talonRepositoryLink: string) =>
								`Sajnos nem, viszont az elődöm, Talon, igen. ` +
								`A forráskódját [itt](${talonRepositoryLink}) tekintheted meg.`,
							'Polish': (talonRepositoryLink: string) =>
								`Niestety nie, chociaż kod źródłowy mojego poprzednika, Talona, jest publiczny. ` +
								`Można zajrzeć w jego kod źródłowy [o tu](${talonRepositoryLink}).`,
							'Romanian': (talonRepositoryLink: string) =>
								`Nu, din păcate. ` +
								`Deși, codul-sursă al predecesorului meu, al lui Talon, este public. ` +
								`Îl puteți vedea [chiar aici](${talonRepositoryLink}).`,
						},
					},
					contributions: {
						'English': 'Contributions',
						// TODO: Add Hungarian localisation.
						'Polish': 'Wkład',
						'Romanian': 'Contribuții',
					},
				},
			},
			guild: {
				name: {
					'English': 'server',
					'Hungarian': 'szerver',
					'Polish': 'serwer',
					'Romanian': 'server',
				},
				description: {
					'English': 'Displays information about the server.',
					'Hungarian': 'A szerverről jelenít meg információt.',
					'Polish': 'Wyświetla informacje o serwerze.',
					'Romanian': 'Afișează informații despre server.',
				},
				strings: {
					informationAbout: {
						'English': (guildName: string) => `Information about **${guildName}**`,
						'Hungarian': (guildName: string) => `Információk – **${guildName}**`,
						'Polish': (guildName: string) => `Informacje o **${guildName}**`,
						'Romanian': (guildName: string) => `Informații despre **${guildName}**`,
					},
					noDescription: {
						'English': 'No description specified.',
						'Hungarian': 'Nincs leírás.',
						'Polish': 'Brak opisu.',
						'Romanian': 'Fără descriere.',
					},
					overseenByModerators: {
						'English': (moderatorRoleName: string) =>
							`This server is overseen by a collective of ${moderatorRoleName}s.`,
						'Hungarian': (moderatorRoleName: string) =>
							`Ezt a szervert **${capitalise(moderatorRoleName)}** rangú tagok felügyelik.`,
						'Polish': (moderatorRoleName: string) =>
							`Ten serwer jest nadzorowany poprzez grupę osób z rolą **${capitalise(moderatorRoleName)}**.`,
						'Romanian': (moderatorRoleName: string) =>
							`Acest server este supravegheat de cătr-un grup de oameni cu rolul **${capitalise(moderatorRoleName)}**.`,
					},
					withoutProficiencyRole: {
						'English': 'without a specified language proficiency.',
						'Hungarian': 'megadott jártasság nélkül.',
						'Polish': 'bez określonej znajomości języka.',
						'Romanian': 'fără o competență lingvistică specificată.',
					},
					fields: {
						description: {
							'English': 'Description',
							'Hungarian': 'Leírás',
							'Polish': 'Opis',
							'Romanian': 'Descriere',
						},
						members: {
							'English': 'Members',
							'Hungarian': 'Tagok',
							'Polish': 'Członkowie',
							'Romanian': 'Membri',
						},
						created: {
							'English': 'Created',
							'Hungarian': 'Létrehozva',
							'Polish': 'Stworzony',
							'Romanian': 'Creat',
						},
						channels: {
							'English': 'Channels',
							'Hungarian': 'Csatornák',
							'Polish': 'Kanały',
							'Romanian': 'Canale',
						},
						owner: {
							'English': 'Owner',
							'Hungarian': 'Tulajdonos',
							'Polish': 'Właściciel',
							'Romanian': 'Properietar',
						},
						moderators: {
							'English': 'Moderators',
							'Hungarian': 'Moderátorok',
							'Polish': 'Moderatorzy',
							'Romanian': 'Moderatori',
						},
						distributionOfMembersLanguageProficiency: {
							'English': 'Distribution of members\' language proficiency',
							// TODO: Change localisation?
							'Hungarian': 'Összetétel jártasság szerint',
							'Polish': 'Rozkład biegłości języcznej członków serwera',
							'Romanian': 'Distribuția competențelor lingvistice ale membrilor',
						},
					},
					channelTypes: {
						text: {
							'English': 'Text',
							'Hungarian': 'Szöveg',
							'Polish': 'Tekstowe',
							'Romanian': 'de Text',
						},
						voice: {
							'English': 'Voice',
							'Hungarian': 'Hang',
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
			'Hungarian': 'játék',
			'Polish': 'gra',
			'Romanian': 'joc',
		},
		description: {
			'English': 'Pick the correct word out of four to fit in the blank.',
			'Hungarian': 'Egészítsd ki a mondatot a megfelelő szóval.',
			'Polish': 'Wybierz słowo, które pasuje do luki w zdaniu.',
			'Romanian': 'Alege cuvântul care se potrivește cu spațiul gol din propoziție.',
		},
		strings: {
			sentence: {
				'English': 'Sentence',
				'Hungarian': 'Mondat',
				'Polish': 'Zdanie',
				'Romanian': 'Propoziție',
			},
			translation: {
				'English': 'Translation',
				'Hungarian': 'Fordítás',
				'Polish': 'Tłumaczenie',
				'Romanian': 'Traducere',
			},
			noSentencesAvailable: {
				'English': 'There are no sentences available in the requested language.',
				'Hungarian': 'Nincs elérhető mondat a kért nyelven.',
				'Polish': 'Nie ma zdań dostępnych w tym języku.',
				'Romanian': 'Nu sunt propoziții disponibile în această limbă.',
			},
		},
	});

	static readonly resources = typedLocalisations({
		name: {
			'English': 'resources',
			'Hungarian': 'segédanyagok',
			'Polish': 'zasoby',
			'Romanian': 'resurse',
		},
		description: {
			'English': 'Displays a list of resources to learn the language.',
			'Hungarian': 'Listázza a nyelvtanulási segédanyagokat.',
			'Polish': 'Wyświetla listę zasób do nauki języka.',
			'Romanian': 'Afișează o listă cu resurse pentru învățarea limbii.',
		},
		strings: {
			// No full stop here.
			resourcesStoredHere: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('English'));

					return `We store resources for learning ${languageLocalised} just here`;
				},
				'Hungarian': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Hungarian'));

					return `Itt találhatóak a(z) ${languageLocalised} nyelv segédanyagai`;
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
			'Hungarian': 'fordítás',
			'Polish': 'przetłumacz',
			'Romanian': 'traducere',
		},
		description: {
			'English': 'Translates a text from the source language to the target language.',
			'Hungarian': 'Lefordít egy szöveget a forrásnyelvről a célnyelvre.',
			'Polish': 'Tłumaczy dany tekst z języka źródłowego na język docelowy.',
			'Romanian': 'Traduce textul dat din limbă-sursă în limbă-țintă.',
		},
		options: {
			// If your language has a grammatical case to express the idea of translating __from__ a language,
			// use the word 'source' here.
			from: {
				name: {
					'English': 'from',
					'Hungarian': 'forrás',
					'Polish': 'z',
					'Romanian': 'din',
				},
				description: {
					'English': 'The source language.',
					'Hungarian': 'A forrásnyelv.',
					'Polish': 'Język źródłowy.',
					'Romanian': 'Limbă-sursă.',
				},
			},
			// If your language has a grammatical case to express the idea of translating __to__ a language,
			// use the word 'target' here.
			to: {
				name: {
					'English': 'to',
					'Hungarian': 'cél',
					'Polish': 'na',
					'Romanian': 'în',
				},
				description: {
					'English': 'The target language.',
					'Hungarian': 'A célnyelv.',
					'Polish': 'Język docelowy.',
					'Romanian': 'Limbă-țintă.',
				},
			},
			text: {
				name: {
					'English': 'text',
					'Hungarian': 'szöveg',
					'Polish': 'tekst',
					'Romanian': 'text',
				},
				description: {
					'English': 'The text to translate.',
					'Hungarian': 'A lefordítandó szöveg.',
					'Polish': 'Tekst do przetłumaczenia.',
					'Romanian': 'Text de tradus.',
				},
			},
		},
		strings: {
			targetLanguageMustBeDifferentFromSource: {
				'English': 'The target language may not be the same as the source language.',
				'Hungarian': 'A forrásnyelv nem egyezhet meg a célnyelvvel.',
				'Polish': 'Język docelowy nie może być taki sam jak język źródłowy.',
				'Romanian': 'Limba-țintă nu poate fi aceeași cu limba-sursă.',
			},
			textCannotBeEmpty: {
				'English': 'The source text may not be empty.',
				'Hungarian': 'A szöveg mezője nem lehet üres.',
				'Polish': 'Tekst źródłowy nie może być pusty.',
				'Romanian': 'Câmpul pentru text-sursă nu poate fi gol.',
			},
			failed: {
				'English': 'Failed to translate the given text.',
				'Hungarian': 'Nem sikerült lefordítani a megadott szöveget.',
				'Polish': 'Tłumaczenie danego tekstu nie powiodło się.',
				'Romanian': 'Traducerea textului dat nu a reușit.',
			},
			invalid: {
				source: {
					'English': 'The source language is invalid.',
					'Hungarian': 'Érvénytelen forrásnyelv.',
					'Polish': 'Język źródłowy jest nieprawidłowy.',
					'Romanian': 'Limba-sursă este nevalidă.',
				},
				target: {
					'English': 'The target language is invalid.',
					'Hungarian': 'Érvénytelen célnyelv.',
					'Polish': 'Język docelowy jest nieprawidłowy.',
					'Romanian': 'Limba-țintă este nevalidă.',
				},
				both: {
					'English': 'Both the source and target languages are invalid.',
					'Hungarian': 'Érvénytelen forrás- és célnyelv.',
					'Polish': 'Oba języki źródłowy oraz docelowy są nieprawidłowe.',
					'Romanian': 'Atât limba-sursă, cât și limba-țintă sunt nevalide.',
				},
			},
			// This word comes after your translation for the word 'from', as in 'translate from English'.
			// If you have used the word 'source' instead of 'from', use the nominative case.
			sourceLanguage: {
				'English': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('English'));

					return languageLocalised;
				},
				'Hungarian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Hungarian'));

					return languageLocalised;
				},
				'Polish': (language: TranslationLanguage) => {
					const languageLocalised = Expressions.polish.cases.genitive.languages[language];

					return languageLocalised;
				},
				'Romanian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Romanian'));

					return languageLocalised;
				},
			},
			// This word comes after your translation for the word 'to', as in 'translate to English'.
			// If you have used the word 'target' instead of 'to', use the nominative case.
			targetLanguage: {
				'English': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('English'));

					return languageLocalised;
				},
				'Hungarian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Hungarian'));

					return languageLocalised;
				},
				'Polish': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Polish'));

					return languageLocalised;
				},
				'Romanian': (language: TranslationLanguage) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Romanian'));

					return languageLocalised;
				},
			},
			sourceText: {
				'English': 'Source Text',
				'Hungarian': 'Forrásszöveg',
				'Polish': 'Tekst Źródłowy',
				'Romanian': 'Text-sursă',
			},
			translation: {
				'English': 'Translation',
				'Hungarian': 'Fordítás',
				'Polish': 'Tłumaczenie',
				'Romanian': 'Traducere',
			},
		},
	});

	static readonly word = typedLocalisations({
		name: {
			'English': 'word',
			'Hungarian': 'szó',
			'Polish': 'słowo',
			'Romanian': 'cuvânt',
		},
		description: {
			'English': 'Displays information about a given word.',
			'Hungarian': 'A megadott szóról jelenít meg információt.',
			'Polish': 'Wyświetla informacje o danym słowie.',
			'Romanian': 'Afișează informații despre un anumit cuvânt.',
		},
		options: {
			word: {
				name: {
					'English': 'word',
					'Hungarian': 'szó',
					'Polish': 'słowo',
					'Romanian': 'cuvânt',
				},
				description: {
					'English': 'The word to display information about.',
					'Hungarian': 'A kifejtendő szó.',
					'Polish': 'Słowo, o którym mają być wyświetlone informacje.',
					'Romanian': 'Cuvântul despre care să fie afișate informații.',
				},
			},
			verbose: {
				name: {
					'English': 'verbose',
					'Hungarian': 'bőbeszédű',
					'Polish': 'tryb-rozwlekły',
					'Romanian': 'mod-prolix',
				},
				description: {
					'English': 'If set to true, more (possibly unnecessary) information will be shown.',
					'Hungarian': 'Ha igen, akkor több (esetleg fölösleges) információ jelenik meg.',
					'Polish': 'Jeśli tak, więcej (możliwie niepotrzebnych) informacji będzie pokazanych.',
					'Romanian': 'Dacă da, mai multe (posibil inutile) informații vor fi afișate.',
				},
			},
		},
		strings: {
			noDictionaryAdapters: {
				'English': 'There are no dictionaries available in the requested language.',
				'Hungarian': 'A kért nyelven nem áll rendelkezésre szótár.',
				'Polish': 'Nie ma słowników dostępnych w tym języku.',
				'Romanian': 'Nu sunt dicționare disponibile în această limbă.',
			},
			noResults: {
				'English': 'No results.',
				'Hungarian': 'Nincs találat.',
				'Polish': 'Brak wyników.',
				'Romanian': 'Fără rezultate.',
			},
			fields: {
				translations: {
					'English': 'Translations',
					'Hungarian': 'Fordítások',
					'Polish': 'Tłumaczenia',
					'Romanian': 'Traduceri',
				},
				pronunciation: {
					'English': 'Pronunciation',
					'Hungarian': 'Kiejtés',
					'Polish': 'Wymowa',
					'Romanian': 'Pronunțare',
				},
				definitions: {
					'English': 'Definitions',
					'Hungarian': 'Meghatározások',
					'Polish': 'Znaczenia',
					'Romanian': 'Definiții',
				},
				etymology: {
					'English': 'Etymology',
					'Hungarian': 'Etimológia',
					'Polish': 'Etymologia',
					'Romanian': 'Etimologie',
				},
				synonyms: {
					'English': 'Synonyms',
					'Hungarian': 'Szinonimák',
					'Polish': 'Synonimy',
					'Romanian': 'Sinonime',
				},
				antonyms: {
					'English': 'Antonyms',
					'Hungarian': 'Antonimák',
					'Polish': 'Antonimy',
					'Romanian': 'Antonime',
				},
				expressions: {
					'English': 'Expressions',
					'Hungarian': 'Kifejezések',
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
					const flag = localise(this.word.options.verbose.name, getLocaleForLanguage('English'));

					return `Omitted ${numberExpression}. ` +
						`To display more results, enable the ${code(flag)} flag.`;
				},
				'Hungarian': (results: number) => {
					const numberExpression = `${results} meghatározás`;
					const flag = localise(this.word.options.verbose.name, getLocaleForLanguage('Hungarian'));

					return `${numberExpression} nincs megjelenítve. ` +
						`Több találat megjelenítéséhez használd a ${code(flag)} kapcsolót.`;
				},
				'Polish': (results: number) => {
					const numberExpression = Expressions.polish.methods.pluralise(
						results.toString(),
						'znaczenie',
						'znaczenia',
						'znaczeń',
					);
					const flag = localise(this.word.options.verbose.name, getLocaleForLanguage('Polish'));

					return `Ominięto ${numberExpression}. ` +
						`Aby wyświetlić więcej rezultatów, użyj flagi ${code(flag)}.`;
				},
				'Romanian': (results: number) => {
					const numberExpression = Expressions.romanian.methods.pluralise(
						results.toString(),
						'definiție',
						'definiții',
					);
					const flag = localise(this.word.options.verbose.name, getLocaleForLanguage('Romanian'));

					return `Au fost omise ${numberExpression}. ` +
						`Pentru a afișa mai multe rezultate, activează fanionul ${code(flag)}.`;
				},
			},
			page: {
				'English': 'Page',
				'Hungarian': 'Oldal',
				'Polish': 'Strona',
				'Romanian': 'Pagina',
			},
			definitions: {
				'English': 'Definitions',
				'Hungarian': 'Meghatározások',
				'Polish': 'Znaczenia',
				'Romanian': 'Definiții',
			},
			definitionsForWord: {
				'English': (word: string) => `Definitions for '${word}'`,
				// TODO: Add Hungarian localisation.
				'Polish': (word: string) => `Znaczenia dla słowa '${word}'`,
				'Romanian': (word: string) => `Definiții pentru cuvântul '${word}'`,
			},
			inflection: {
				'English': 'Inflection',
				'Hungarian': 'Hajlítás',
				'Polish': 'Odmiana',
				'Romanian': 'Flexiune',
			},
			verbs: {
				moodsAndParticiples: {
					'English': 'Moods and participles',
					'Hungarian': 'Módok és igenevek',
					'Polish': 'Tryby oraz imiesłowy',
					'Romanian': 'Moduri și participii',
				},
				moods: {
					conditional: {
						'English': 'Conditional',
						'Hungarian': 'Feltételes',
						'Polish': 'Warunkowy',
						'Romanian': 'Condițional',
					},
					imperative: {
						'English': 'Imperative',
						'Hungarian': 'Felszólító',
						'Polish': 'Rozkazujący',
						'Romanian': 'Imperativ',
					},
					indicative: {
						'English': 'Indicative',
						'Hungarian': 'Kijelentő',
						'Polish': 'Oznajmujący',
						'Romanian': 'Indicativ',
					},
					infinitive: {
						'English': 'Infinitive',
						'Hungarian': 'Főnévi igenév',
						'Polish': 'Bezokolicznik',
						'Romanian': 'Infinitiv',
					},
					longInfinitive: {
						'English': 'Long infinitive',
						'Hungarian': 'Hosszú főnévi igenév',
						'Polish': 'Bezokolicznik długi',
						'Romanian': 'Infinitiv lung',
					},
					optative: {
						'English': 'Optative',
						'Hungarian': 'Optatív',
						'Polish': 'Życzący',
						'Romanian': 'Optativ',
					},
					presumptive: {
						'English': 'Presumptive',
						'Hungarian': 'Prezumptív',
						'Polish': 'Przypuszczający',
						'Romanian': 'Prezumtiv',
					},
					subjunctive: {
						'English': 'Subjunctive',
						'Hungarian': 'Kötőmód',
						'Polish': 'Łączący',
						'Romanian': 'Conjunctiv',
					},
					supine: {
						'English': 'Supine',
						'Hungarian': 'Szupinum',
						'Polish': 'Celujący',
						'Romanian': 'Supin',
					},
				},
				participles: {
					present: {
						'English': 'Present participle',
						'Hungarian': 'Folyamatos melléknévi igenév',
						'Polish': 'Imiesłów przysłówkowy współczesny',
						'Romanian': 'Participiu prezent',
					},
					past: {
						'English': 'Past participle',
						'Hungarian': 'Befejezett melléknévi igenév',
						'Polish': 'Imiesłów przymiotnikowy bierny',
						'Romanian': 'Participiu trecut',
					},
				},
				popular: {
					'English': 'popular',
					'Hungarian': 'népies',
					'Polish': 'popularny',
					'Romanian': 'popular',
				},
				tenses: {
					tenses: {
						'English': 'Tenses',
						'Hungarian': 'Igeidők',
						'Polish': 'Czasy',
						'Romanian': 'Timpuri',
					},
					present: {
						'English': 'Present',
						'Hungarian': 'Jelen',
						'Polish': 'Teraźniejszy',
						'Romanian': 'Prezent',
					},
					presentContinuous: {
						'English': 'Present continuous',
						'Hungarian': 'Folyamatos jelen',
						'Polish': 'Teraźniejszy ciągły',
						'Romanian': 'Prezent continuu',
					},
					imperfect: {
						'English': 'Imperfect',
						'Hungarian': 'Folyamatos múlt',
						'Polish': 'Przeszły niedokonany',
						'Romanian': 'Imperfect',
					},
					preterite: {
						'English': 'Preterite',
						'Hungarian': 'Elbeszélő múlt',
						'Polish': 'Przeszły',
						'Romanian': 'Perfect simplu',
					},
					pluperfect: {
						'English': 'Pluperfect',
						'Hungarian': 'Régmúlt',
						'Polish': 'Zaprzeszły',
						'Romanian': 'Mai mult ca perfect',
					},
					perfect: {
						'English': 'Perfect',
						'Hungarian': 'Befejezett múlt',
						'Polish': 'Dokonany',
						'Romanian': 'Perfect',
					},
					compoundPerfect: {
						'English': 'Compound perfect',
						'Hungarian': 'Összetett múlt',
						'Polish': 'Dokonany złożony',
						'Romanian': 'Perfect compus',
					},
					future: {
						'English': 'Future',
						'Hungarian': 'Jövő',
						'Polish': 'Przyszły',
						'Romanian': 'Viitor',
					},
					futureCertain: {
						'English': 'Certain future',
						'Hungarian': 'Biztos jövő',
						'Polish': 'Przyszły pewny',
						'Romanian': 'Viitor cert',
					},
					futurePlanned: {
						'English': 'Planned future',
						'Hungarian': 'Tervezett jövő',
						'Polish': 'Przyszły zaplanowany',
						'Romanian': 'Viitor planificat',
					},
					futureDecided: {
						'English': 'Decided future',
						'Hungarian': 'Eldöntött jövő',
						'Polish': 'Przyszły zdecydowany',
						'Romanian': 'Viitor decis',
					},
					futureIntended: {
						'English': 'Intended future',
						'Hungarian': 'Szándékolt jövő',
						'Polish': 'Przyszły zamierzony',
						'Romanian': 'Viitor intenționat',
					},
					futureInThePast: {
						'English': 'Future-in-the-past',
						'Hungarian': 'Jövő a múltban',
						'Polish': 'Przyszłość w przeszłości',
						'Romanian': 'Viitor în trecut',
					},
					futurePerfect: {
						'English': 'Future perfect',
						'Hungarian': 'Befejezett jövő',
						'Polish': 'Przyszły dokonany',
						'Romanian': 'Viitor anterior',
					},
				},
			},
			nouns: {
				cases: {
					cases: {
						'English': 'Cases',
						'Hungarian': 'Esetek',
						'Polish': 'Przypadki',
						'Romanian': 'Cazuri',
					},
					nominativeAccusative: {
						'English': 'Nominative-accusative',
						'Hungarian': 'Alany-tárgy',
						'Polish': 'Mianownik-biernik',
						'Romanian': 'Nominativ-acuzativ',
					},
					genitiveDative: {
						'English': 'Genitive-dative',
						'Hungarian': 'Birtokos-részes',
						'Polish': 'Dopełniacz-celownik',
						'Romanian': 'Genitiv-dativ',
					},
					vocative: {
						'English': 'Vocative',
						'Hungarian': 'Megszólító',
						'Polish': 'Wołacz',
						'Romanian': 'Vocativ',
					},
				},
				singular: {
					'English': 'Singular',
					'Hungarian': 'Egyes szám',
					'Polish': 'Liczba pojedyncza',
					'Romanian': 'Singular',
				},
				plural: {
					'English': 'Plural',
					'Hungarian': 'Többes szám',
					'Polish': 'Liczba mnoga',
					'Romanian': 'Plural',
				},
			},
		},
	});

	static readonly list = typedLocalisations({
		name: {
			'English': 'list',
			'Hungarian': 'listázás',
			'Polish': 'spisz',
			'Romanian': 'enumerare',
		},
		description: {
			'English': 'Allows the viewing of various information about users.',
			'Hungarian': 'Különféle információkat tesz elérhetővé a felhasználókról.',
			'Polish': 'Pozwala na wyświetlanie różnych informacji o użytkownikach.',
			'Romanian': 'Permite afișarea diverselor informații despre utilizatori.',
		},
		options: {
			warnings: {
				name: {
					'English': 'warnings',
					'Hungarian': 'figyelmeztetések',
					'Polish': 'ostrzeżenia',
					'Romanian': 'avertizări',
				},
				description: {
					'English': 'Lists the warnings issued to a user.',
					'Hungarian': 'Felsorolja a felhasználónak adott figyelmeztetéseket.',
					'Polish': 'Wyświetla ostrzeżenia dane użytkownikowi.',
					'Romanian': 'Afișează avertizările care au fost date unui utilizator.',
				},
			},
		},
		strings: {
			unableToDisplayWarnings: {
				'English': 'The warnings for the given user could not be shown.',
				'Hungarian': 'Nem lehetett megjeleníteni a felhasználó figyelmeztetéseit.',
				'Polish': 'Nie udało się wyświetlić ostrzeżeń dla danego użytkownika.',
				'Romanian': 'Avertizările pentru utilizatorul dat nu au putut fi afișate.',
			},
			hasNoActiveWarnings: {
				'English': 'This user does not have any active warnings.',
				'Hungarian': 'Ez a felhasználó még nem kapott figyelmeztetést.',
				'Polish': 'Ten użytkownik nie ma żadnych aktywnych ostrzeżeń.',
				'Romanian': 'Acest utilizator nu are avertismente active.',
			},
			hasNoActiveWarningsDirect: {
				'English': 'You have no active warnings.',
				// TODO: Add Hungarian translations.
				'Polish': 'Nie masz żadnych aktywnych ostrzeżeń.',
				'Romanian': 'Nu ai avertismente active.',
			},
			warnings: {
				'English': 'Warnings',
				'Hungarian': 'Figyelmeztetések',
				'Polish': 'Ostrzeżenia',
				'Romanian': 'Avertizări',
			},
			warning: {
				'English': (index: number, timestamp: string) => `Warning #${index}, given ${timestamp}`,
				// TODO: Add Hungarian translations.
				'Polish': (index: number, timestamp: string) => `Ostrzeżenie nr. ${index}, przydzielone ${timestamp}`,
				'Romanian': (index: number, timestamp: string) => `Avertismentul nr. ${index}, atribuit ${timestamp}`,
			},
		},
	});

	static readonly pardon = typedLocalisations({
		name: {
			'English': 'pardon',
			'Hungarian': 'kegy',
			'Polish': 'ułaskaw',
			'Romanian': 'grațiere',
		},
		description: {
			'English': 'Removes one of the warnings previously given to a user.',
			// TODO: Hungarian localisation.
			'Polish': 'Usuwa jedno z ostrzeżeń poprzednio przyjęte przez użytkownika.',
			'Romanian': 'Elimină unul dintre avertismentele acceptate anterior de către utilizator.',
		},
		options: {
			warning: {
				name: {
					'English': 'warning',
					'Hungarian': 'figyelmeztetés',
					'Polish': 'ostrzeżenie',
					'Romanian': 'avertisment',
				},
				description: {
					'English': 'The warning to remove.',
					'Hungarian': 'Az eltávolítandó figyelmeztetés.',
					'Polish': 'Ostrzeżenie, które ma zostać usunięte.',
					'Romanian': 'Avertismentul care să fie eliminat.',
				},
			},
		},
		strings: {
			failed: {
				'English': 'Failed to remove warning.',
				'Hungarian': 'A figyelmeztetés eltávolítása sikertelen.',
				'Polish': 'Nie udało się usunąć ostrzeżenia.',
				'Romanian': 'Nu s-a putut elimina avertismentul.',
			},
			invalidWarning: {
				'English': 'The warning you specified is invalid.',
				// TODO: Add Hungarian translation.
				'Polish': 'Ostrzeżenie, które sprecyzowałeś/aś, jest nieprawidłowe.',
				'Romanian': 'Avertismentul pe care l-ai specificat este invalid.',
			},
			pardoned: {
				'English': (userMention: string, reason: string) =>
					`User ${userMention} has been pardoned from their warning for: ${reason}`,
				'Hungarian': (userMention: string, reason: string) =>
					`${userMention} felhasználó kegyelmet kapott az alábbi okból kapott figyelmeztetése alól: ${reason}`,
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
			// TODO: Add Hungarian localisation.
			'Polish': 'polityka',
			'Romanian': 'politică',
		},
		description: {
			'English': 'Displays the server moderation policy.',
			// TODO: Add Hungarian localisation.
			'Polish': 'Wyświetla politykę moderowania serwera.',
			'Romanian': 'Afișează politica de moderare a serverului.',
		},
	});

	static readonly report = typedLocalisations({
		name: {
			'English': 'report',
			// TODO: Add Hungarian localisation.
			'Polish': 'skarga',
			'Romanian': 'plângere',
		},
		description: {
			'English': 'Allows the user to create a user report.',
			// TODO: Add Hungarian localisation.
			'Polish': 'Umożliwia użytkownikowi złożenie skargi na użytkownika.',
			'Romanian': 'Permite utilizatorului să depună o plângere împotriva unuia sau mai mulți utilizatori.',
		},
		strings: {
			reportSubmitted: {
				// Use exclamation if possible.
				header: {
					'English': 'Report submitted!',
					// TODO: Add Hungarian localisation.
					'Polish': 'Skarga złożona!',
					'Romanian': 'Plângere depusă!',
				},
				body: {
					'English': 'Your report has been submitted. ' +
						'The report will be reviewed by the server staff, but you will not be notified directly about the outcome of a particular report.',
					// TODO: Add Hungarian localisation.
					'Polish': 'Twoja skarga została złożona.' +
						'Moderatorzy serwera przejrzą raport, ale nie zostaniesz bezpośrednio powiadomiony/a o jego skutku.',
					'Romanian': 'Plângerea ta a fost depusă.' +
						'Moderatorii serverului vor analiza raportul, dar nu vei fi informat/ă direct despre rezultatul său.',
				},
			},
			failedToSubmitReport: {
				'English': 'Failed to submit report.',
				// TODO: Add Hungarian localisation.
				'Polish': 'Nie udało się złożyć skargi.',
				'Romanian': 'Nu s-a putut depune plângerea.',
			},
			specifiedUsersIncorrectly: (exampleExpression: string) => ({
				'English': 'You have incorrectly specified which users to report.\n\n' +
					'To identify a user, include their ID or tag. ' +
					//'Alternatively, users can be named directly. ' +
					'User identifiers must be separated using a comma.\n\n' +
					`Example of a valid expression:\n${exampleExpression}`,
				// TODO: Add Hungarian localisation.
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
				// TODO: Add Hungarian localisation.
				'Polish': 'Zidentyfikowałeś/aś tego samego użytkownika więcej niż jeden raz.\n\n' +
					'Zanim spróbujesz ponownie wysłać skargę, upewnij się, że istnieje tylko jedna wzmianka o każdym pojedynczym użytkowniku.',
				'Romanian': 'Ai identificat același utilizator de mai multe ori.\n\n' +
					'Înainte de a încerca din nou să transmiți plângerea, asigurează-te că fiecare utilizator este menționat doar o singură dată în raport.',
			},
			cannotSubmitReportAgainstSelf: {
				'English': 'You cannot submit a report against yourself.',
				// TODO: Add Hungarian localisation.
				'Polish': 'Nie możesz złożyć skargi przeciw samemu/samej sobie.',
				'Romanian': 'Nu poți depune o plângere împotriva ta.',
			},
			areYouSureToStopSubmitting: {
				'English': 'Are you sure you want to stop submitting the report?',
				// TODO: Add Hungarian localisation.
				'Polish': 'Czy jesteś pewny/a, że chcesz anulować składanie skargi?',
				'Romanian': 'Ești sigur/ă că vrei să anulezi depunerea plângerii?',
			},
			waitBeforeReporting: {
				'English': 'You have already made a few reports recently.\n\n' +
					'You should wait before reporting somebody again.',
				// TODO: Add Hungarian localisation.
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
				// TODO: Add Hungarian localisation.
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
			'Hungarian': 'szabály',
			'Polish': 'reguła',
			'Romanian': 'regulă',
		},
		description: {
			'English': 'Cites a server rule.',
			'Hungarian': 'Idézi a szerver egyik szabályát.',
			'Polish': 'Cytuje jedną z reguł serwera.',
			'Romanian': 'Citează o regulă din regulament.',
		},
		options: {
			rule: {
				name: {
					'English': 'rule',
					'Hungarian': 'szabály',
					'Polish': 'reguła',
					'Romanian': 'regulă',
				},
				description: {
					'English': 'The rule to cite.',
					'Hungarian': 'Az idézendő szabály.',
					'Polish': 'Reguła, która ma być zacytowana.',
					'Romanian': 'Regula care să fie citată.',
				},
			},
		},
		strings: {
			invalidRule: {
				'English': 'Invalid rule.',
				'Hungarian': 'Érvénytelen szabály.',
				'Polish': 'Nieprawidłowa reguła.',
				'Romanian': 'Regulă invalidă.',
			},
		},
	});

	static readonly timeout = typedLocalisations({
		name: {
			'English': 'timeout',
			'Hungarian': 'timeout',
			'Polish': 'timeout',
			'Romanian': 'timeout',
		},
		description: {
			'English': 'Used to manage user timeouts.',
			'Hungarian': 'Felhasználók ideiglenes felfüggesztését kezelő parancs.',
			'Polish': 'Komenda używana do zarządzania wyciszaniem użytkowników.',
			'Romanian': 'Comandă utilizată pentru gestionarea pauzelor utilizatorilor.',
		},
		options: {
			set: {
				name: {
					'English': 'set',
					'Hungarian': 'aktiválás',
					'Polish': 'ustaw',
					'Romanian': 'setare',
				},
				description: {
					'English': 'Times a user out, making them unable to interact on the server.',
					'Hungarian': 'Felfüggeszti a felhasználót, aki így nem tud semmilyen interakciót végrehajtani a szerveren.',
					'Polish': 'Wycisza użytkownika, uniemożliwiając mu interakcję z serwerem (pisanie, mówienie w VC, itp.).',
					'Romanian': 'Face ca un utilizator să nu mai poată interacționa în server.',
				},
			},
			clear: {
				name: {
					'English': 'clear',
					'Hungarian': 'feloldás',
					'Polish': 'usuń',
					'Romanian': 'ștergere',
				},
				description: {
					'English': 'Clears a user\'s timeout.',
					'Hungarian': 'Feloldja a felhasználó felfüggesztését.',
					'Polish': 'Umożliwia użytkownikowi, który został wyciszony, ponowną interakcję z serwerem.',
					'Romanian': 'Permite utilizatorului care a primit un timeout să interacționeze cu serverul.',
				},
			},
		},
		strings: {
			invalidDuration: {
				'English': 'The specified duration is invalid.',
				'Hungarian': 'A megadott időtartam érvénytelen.',
				'Polish': 'Określony okres czasu nie jest prawidłowy.',
				'Romanian': 'Durata precizată nu este validă.',
			},
			durationMustBeLongerThanMinute: {
				'English': 'The duration must be longer than a minute.',
				'Hungarian': 'A megadott időtartam érvénytelen.',
				'Polish': 'Wyciszenie musi trwać przynajmniej minutę.',
				'Romanian': 'Pauza trebuie să dureze mai mult decât un minut.',
			},
			durationMustBeShorterThanWeek: {
				'English': 'The duration must not be longer than a week.',
				'Hungarian': 'Az időtartam nem lehet hosszabb egy hétnél.',
				'Polish': 'Wyciszenie nie może trwać dłużej niż tydzień.',
				'Romanian': 'Pauza nu poate să dureze mai mult decât o săptămână.',
			},
			timedOut: {
				'English': (userMention: string, until: string) =>
					`User ${userMention} has been timed out. ` +
					`The timeout will expire ${until}.`,
				'Hungarian': (userMention: string, until: string) =>
					`${userMention} felhasználó fel lett függesztve. ` +
					`A felfüggesztés ${until} jár le.`,
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
				'Hungarian': (userMention: string, until: string, reason: string) =>
					`${userMention} felhasználó fel lett függesztve. Ok: ${reason}\n\n ` +
					`A felfüggesztés ${until} jár le.`,
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
				'English': 'The specified user is not currently timed out.',
				'Hungarian': 'A megadott felhasználó jelenleg nincs felfüggesztve.',
				'Polish': 'Ten użytkownik nie jest wyciszony.',
				'Romanian': 'Acest utilizator nu a avut un timeout impus pe el.',
			},
			timeoutCleared: {
				'English': (userMention: string) => `User ${userMention} is no longer timed out.`,
				'Hungarian': (userMention: string) => `${userMention} felhasználó mostantól nincs felfüggesztve.`,
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
			'Hungarian': 'figyelmeztetés',
			'Polish': 'ostrzeż',
			'Romanian': 'avertizare',
		},
		description: {
			'English': 'Warns a user.',
			'Hungarian': 'Figyelmezteti a megadott felhasználót.',
			'Polish': 'Ostrzega użytkownika.',
			'Romanian': 'Avertizează un utilizator.',
		},
		strings: {
			failed: {
				'English': 'Failed to warn user.',
				'Hungarian': 'Felhasználó figyelmeztetése sikertelen.',
				'Polish': 'Nie udało się ostrzec użytkownika.',
				'Romanian': 'Nu s-a putut avertiza utilizatorul.',
			},
			warned: {
				'English': (userMention: string, warningCount: number) =>
					`User ${userMention} has been warned. ` +
					`They now have ${warningCount} warnings.`,
				'Hungarian': (userMention: string, warningCount: number) =>
					`${userMention} felhasználó figyelmeztetést kapott. ` +
					`Most ${warningCount} figyelmeztetése van.`,
				'Polish': (userMention: string, warningCount: number) =>
					`Użytkownik ${userMention} został ostrzeżony. ` +
					`Razem ostrzeżeń: ${warningCount}.`,
				'Romanian': (userMention: string, warningCount: number) =>
					`Utilizatorul ${userMention} a fost avertizat. ` +
					`Avertizări în total: ${warningCount}.`,
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
		},
	});

	static readonly music = typedLocalisations({
		name: {
			'English': 'music',
			'Hungarian': 'zene',
			'Polish': 'muzyka',
			'Romanian': 'muzică',
		},
		description: {
			'English': 'Allows the user to manage music playback in a voice channel.',
			'Hungarian': 'Lehetővé teszi a zenelejátszás kezelését egy hangcsatornában.',
			'Polish': 'Pozwala użytkownikowi na zarządanie odtwarzaniem muzyki w kanale głosowym.',
			'Romanian': 'Permite utilizatorului gestionarea redării muzicii într-un canal de voce.',
		},
		options: {
			history: {
				name: {
					'English': 'history',
					'Hungarian': 'előzmények',
					'Polish': 'historia',
					'Romanian': 'istorie',
				},
				description: {
					'English': 'Displays a list of previously played songs.',
					'Hungarian': 'Megjeleníti a korábban játszott zenék listáját.',
					'Polish': 'Wyświetla listę zagranych piosenek.',
					'Romanian': 'Afișează lista tututor melodiilor redate.',
				},
				strings: {
					playbackHistory: {
						'English': 'Playback history',
						'Hungarian': 'Lejátszási előzmények',
						'Polish': 'Historia odtwarzania',
						'Romanian': 'Istoricul redării',
					},
				},
			},
			now: {
				name: {
					'English': 'now',
					'Hungarian': 'most',
					'Polish': 'teraz',
					'Romanian': 'acum',
				},
				description: {
					'English': 'Displays the currently playing song.',
					'Hungarian': 'Az éppen játszott zenét jeleníti meg.',
					'Polish': 'Wyświetla obecnie odtwarzany utwór lub zbiór utworów.',
					'Romanian': 'Afișează melodia sau setul de melodii în curs de redare.',
				},
				strings: {
					noSongPlaying: {
						'English': 'There is no song to display the details of.',
						'Hungarian': 'Jelenleg nem szól semmi.',
						'Polish': 'Nie można wyświetlić informacji o utworze, ponieważ żaden utwór obecnie nie jest odtwarzany.',
						'Romanian': 'Nu s-au putut afișa informații despre melodie fiindcă în prezent nu se redă nicio melodie.',
					},
					noCollectionPlaying: {
						'English': 'There is no song collection to show the details of.\n\n' +
							'Try requesting information about the current song instead.',
						'Hungarian': 'Jelenleg nincs lejátszás alatt zenegyűjemény.\n\n' +
							'Helyette megpróbálhatod lekérni az éppen játszott zenét.',
						'Polish':
							'Nie można wyświetlić informacji o zbiorze utworów, ponieważ żaden zbiór utworów obecnie nie jest odtwarzany.\n\n' +
							'Spróbuj wysłać prośbę o wyświetlenie informacji o samym utworze.',
						'Romanian':
							'Nu s-au putut afișa informații despre melodie fiindcă în prezent nu se redă niciun set de melodii.\n\n' +
							'Încearcă să trimiți o cerere de informații despre melodia actuală.',
					},
					nowPlaying: {
						'English': 'Now playing',
						'Hungarian': 'Most szól',
						'Polish': 'Teraz odtwarzane',
						'Romanian': 'În curs de redare',
					},
					songs: {
						'English': 'Songs',
						'Hungarian': 'Zenék',
						'Polish': 'Utwory',
						'Romanian': 'Melodii',
					},
					collection: {
						'English': 'Collection',
						'Hungarian': 'Gyűjtemény',
						'Polish': 'Zbiór',
						'Romanian': 'Set',
					},
					track: {
						'English': 'Track',
						'Hungarian': 'Szám',
						'Polish': 'Track',
						'Romanian': 'Track',
					},
					title: {
						'English': 'Title',
						'Hungarian': 'Cím',
						'Polish': 'Tytuł',
						'Romanian': 'Titlu',
					},
					requestedBy: {
						'English': 'Requested by',
						'Hungarian': 'A zenét kérte',
						'Polish': 'Na prośbę',
						'Romanian': 'Conform cererii',
					},
					runningTime: {
						'English': 'Running time',
						'Hungarian': 'Teljes időtartam',
						'Polish': 'Czas odtwarzania',
						'Romanian': 'Perioadă de redare',
					},
					playingSince: {
						'English': (timestamp: string) => `Since ${timestamp}.`,
						'Hungarian': (timestamp: string) => `${timestamp} óta.`,
						'Polish': (timestamp: string) => `Od ${timestamp}.`,
						'Romanian': (timestamp: string) => `De la ${timestamp}.`,
					},
					startTimeUnknown: {
						'English': 'Start time unknown.',
						// TODO: Add Hungarian localisation.
						'Polish': 'Czas rozpoczęcia odtwarzania nieznany.',
						'Romanian': 'Oră de început a redării necunoscută.',
					},
					sourcedFrom: {
						'English': (origin: string) => `This listing was sourced from ${origin}.`,
						'Hungarian': (origin: string) => `A lista forrása: ${origin}.`,
						'Polish': (origin: string) => `Ten wpis został pobrany z ${origin}.`,
						'Romanian': (origin: string) => `Această înregistrare a fost furnizată de pe ${origin}.`,
					},
					// This string fits with the above ones. 'This listing was sourced from __the internet__'.
					theInternet: {
						'English': 'the internet',
						'Hungarian': 'internet',
						'Polish': 'internetu',
						'Romanian': 'internet',
					},
				},
			},
			pause: {
				name: {
					'English': 'pause',
					'Hungarian': 'szünet',
					'Polish': 'zapauzuj',
					'Romanian': 'pauzare',
				},
				description: {
					'English': 'Pauses the currently playing song or song collection.',
					'Hungarian': 'Szünetelteti az aktuális zene vagy gyűjtemény lejátszását.',
					'Polish': 'Zapauzuj obecny utwór lub zbiór utworów.',
					'Romanian': 'Pauzează melodia sau setul de melodii în curs de redare.',
				},
				strings: {
					noSongToPause: {
						'English': 'There is no song to pause.',
						'Hungarian': 'Nincs mit szüneteltetni.',
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
					'Hungarian': 'lejátszás',
					'Polish': 'odtwórz',
					'Romanian': 'redare',
				},
				description: {
					'English': 'Allows the user to play music in a voice channel.',
					'Hungarian': 'Zenelejátszást tesz lehetővé egy hangcsatornában.',
					'Polish': 'Pozwala użytkownikowi na odtwarzanie muzyki w kanale głosowym.',
					'Romanian': 'Permite utilizatorului să redea muzică într-un canal de voce.',
				},
				options: {
					file: {
						name: {
							'English': 'file',
							'Hungarian': 'fájl',
							'Polish': 'plik',
							'Romanian': 'fișier',
						},
						description: {
							'English': 'Plays an external audio file.',
							'Hungarian': 'Lejátszik egy külső forrásból származó hangfájlt.',
							'Polish': 'Odtwarza muzykę w kształcie zewnętrznego pliku audio.',
							'Romanian': 'Redă muzică în forma unui fișier audio extern.',
						},
						options: {
							url: {
								name: {
									'English': 'url',
									'Hungarian': 'url',
									'Polish': 'url',
									'Romanian': 'url',
								},
								description: {
									'English': 'Link to the audio file.',
									'Hungarian': 'A hangfájl linkje.',
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
							'Hungarian': `${name} használata a zene forrásaként.`,
							'Polish': `Odtwarza utwór dostępny na ${name}.`,
							'Romanian': `Redă o melodie disponibilă pe ${name}.`,
						},
					}),
				},
				strings: {
					selectSong: {
						header: {
							'English': 'Select song or song collection',
							// TODO: Add Hungarian localisation.
							'Polish': 'Wybierz utwór lub zbiór utworów',
							'Romanian': 'Selectează o melodie sau un set de melodii',
						},
						body: {
							'English': 'Select a song or song collection from the choices below.',
							// TODO: Add Hungarian localisation.
							'Polish': 'Wybierz utwór lub zbiór utworów z listy poniżej.',
							'Romanian': 'Selectează o melodie sau un set de melodii din lista de mai jos.',
						},
					},
					externalFile: {
						'English': 'External file',
						'Hungarian': 'Külső file',
						'Polish': 'Zewnętrzny plik',
						'Romanian': 'Fișier extern',
					},
					songNotFound: {
						'English': 'Couldn\'t find the requested song.\n\n' +
							'You could try an alternative search, or request a different song.',
						'Hungarian': 'A kért zene nem található.\n\n' +
							'Próbálkozz más keresési móddal vagy egy másik zeneszámmal.',
						'Polish': 'Nie udało się znaleźć utworu.\n\n' +
							'Spróbuj wyszukać utworu w inny sposób, lub odtworzyć inny otwór.',
						'Romanian': 'Nu s-a putut găsi melodia.\n\n' +
							'Încearcă să cauți melodia într-un mod diferit, sau să redai o altă melodie.',
					},
					mustBeInVoiceChannel: {
						'English': 'To manipulate music, you must be in a voice channel.',
						// TODO: Add Hungarian localisation.
						'Polish': 'Aby móc kontrolować odtwarzanie muzyki, wpierw musisz się znajdywać w kanale głosowym.',
						'Romanian': 'Pentru a gestiona redarea muzicii, trebuie mai întâi să întri în canal de voce.',
					},
					alreadyPlayingInAnotherVoiceChannel: {
						'English': 'The bot is playing music in another voice channel.',
						// TODO: Add Hungarian localisation.
						'Polish': 'Bot odtwarza już muzykę w innym kanale.',
						'Romanian': 'Bot-ul redă deja muzică într-un canal diferit.',
					},
					queueIsFull: {
						'English':
							'The queue is full. Try removing a song from the song queue, skip the current song to advance the queue immediately, or wait until the current song finishes playing.',
						// TODO: Add Hungarian localisation.
						'Polish':
							'Kolejka jest pełna. Spróbuj usunąć jeden z utworów znajdujących się w kolejce, przewiń obecnie odtwarzany utwór aby sprawić, by kolejka się przesunęła, lub poczekaj, aż odtwarzanie utworu samo się zakończy.',
						'Romanian':
							'Coada este plină. Încearcă să elimini una dintre melodiile care se află deja în coadă, sari peste melodia care se redă în prezent pentru a face ca coada să se miște, sau așteaptă ca redarea melodiei să se termine singură.',
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
					'Hungarian': 'sor',
					'Polish': 'kolejka',
					'Romanian': 'coadă',
				},
				description: {
					'English': 'Displays a list of queued song listings.',
					'Hungarian': 'Megjeleníti a várakozási sorban levő zenéket és zenegyűjteményeket.',
					'Polish': 'Wyświetla listę utworów oraz zbiorów utworów w kolejce.',
					'Romanian': 'Afișează lista cu melodii și seturi de melodii în coadă.',
				},
				strings: {
					queue: {
						'English': 'Queue',
						'Hungarian': 'Sor',
						'Polish': 'Kolejka',
						'Romanian': 'Coadă',
					},
				},
			},
			remove: {
				name: {
					'English': 'remove',
					'Hungarian': 'eltávolítás',
					'Polish': 'usuń',
					'Romanian': 'ștergere',
				},
				description: {
					'English': 'Removes a song listing from the queue.',
					'Hungarian': 'Eltávolít egy elemet a sorból.',
					'Polish': 'Usuwa wpis z kolejki muzycznej.',
					'Romanian': 'Șterge o înregistrare din coadă.',
				},
				strings: {
					noListingToRemove: {
						'English': 'There are no songs in the queue.',
						'Hungarian': 'Nincs mit eltávolítani a sorból.',
						'Polish': 'Nie ma utworów w kolejce.',
						'Romanian': 'Nu sunt melodii în coadă.',
					},
					selectSongToRemove: {
						'English': 'Select a song or song collection to remove from the choices below.',
						'Hungarian': 'Válaszd ki az eltávolítandó elemet.',
						'Polish': 'Wybierz utwór lub zbiór utworów do usunięcia poniżej.',
						'Romanian': 'Alege o melodie sau un set de melodii de șters mai jos.',
					},
					failedToRemoveSong: {
						'English': 'Failed to remove the selected song.',
						'Hungarian': 'A kiválasztott zene eltávolítása sikertelen.',
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
					'Hungarian': 'újrakezdés',
					'Polish': 'powtórz',
					'Romanian': 'reluare',
				},
				description: {
					'English': 'Begins playing the currently playing song from the start.',
					'Hungarian': 'Újraindítja az aktuális zenét az elejétől.',
					'Polish': 'Odtwarza obecnie grający utwór od początku.',
					'Romanian': 'Redă melodia în curs de redare din nou.',
				},
				strings: {
					noSongToReplay: {
						'English': 'There is no song to replay.',
						'Hungarian': 'Nincs mit elölről kezdeni.',
						'Polish': 'Nie ma utworu do ponownego odtworzenia.',
						'Romanian': 'Nu este o melodie de redat din nou.',
					},
					noSongCollectionToReplay: {
						'English': 'There is no song collection to replay.\n\n' +
							'Try replaying the current song instead.',
						'Hungarian': 'Nincs elölről indítható zenegyűjtemény.\n\n' +
							'Helyette megpróbálhatod újraindítani az éppen játszott zenét.',
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
					'Hungarian': 'folytatás',
					'Polish': 'wznów',
					'Romanian': 'continuare',
				},
				description: {
					'English': 'Unpauses the currently playing song if it is paused.',
					'Hungarian': 'Folytatja egy szüneteltetett zeneszám lejátszását.',
					'Polish': 'Wznawia odtwarzanie obecnie grającego utworu, jeśli ten jest zapauzowany.',
					'Romanian': 'Anulează întreruperea redării melodiei actuale dacă aceasta este în pauză.',
				},
				strings: {
					noSongToResume: {
						'English': 'There is no song to resume the playing of.',
						'Hungarian': 'Nincs folytatható zeneszám.',
						'Polish': 'Nie ma piosenki do wznowienia odtwarzania.',
						'Romanian': 'Nu este o melodie pentru a-i relua redarea.',
					},
					notCurrentlyPaused: {
						'English': 'The current song is not paused.',
						'Hungarian': 'Az aktuális zeneszám nem szünetel.',
						'Polish': 'Obecny utwór nie jest zatrzymany.',
						'Romanian': 'Melodia actuală nu este oprită.',
					},
					resumed: {
						header: { 'English': 'Resumed' },
						body: { 'English': 'Music playback has been resumed.' },
					},
				},
			},
			skipTo: {
				name: {
					'English': 'seek',
					// TODO: Add Hungarian localisation.
					'Polish': 'przewiń-do-punktu',
					'Romanian': 'sărire-la-punct',
				},
				description: {
					'English': 'Skips to a given point in the currently playing song.',
					// TODO: Add Hungarian localisation.
					'Polish': 'Przewija do danego punktu w obecnie grającym utworze.',
					'Romanian': 'Avansează până la un anumit punct într-o melodie.',
				},
				strings: {
					skippedTo: {
						header: { 'English': 'Skipped to timestamp' },
						body: { 'English': 'Playback has skipped to the specified timestamp.' },
					},
				},
			},
			skip: {
				name: {
					'English': 'skip',
					'Hungarian': 'átugrás',
					'Polish': 'przewiń',
					'Romanian': 'sărire-peste',
				},
				description: {
					'English': 'Skips the currently playing song.',
					'Hungarian': 'Átugorja az éppen játszott zenét.',
					'Polish': 'Przewija obecnie grający utwór.',
					'Romanian': 'Sare peste melodia în curs de redare.',
				},
				strings: {
					noSongToSkip: {
						'English': 'There is no song to skip.',
						'Hungarian': 'Nincs mit átugrani.',
						'Polish': 'Nie ma utworu do przewinięcia.',
						'Romanian': 'Nu este o melodie de sărit peste.',
					},
					noSongCollectionToSkip: {
						'English': 'There is no song collection to skip.\n\n' +
							'Try skipping the current song instead.',
						'Hungarian': 'Nincs átugorható zenegyűjtemény.\n\n' +
							'Helyette megpróbálhatod átugrani az éppen játszott zenét.',
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
					'Hungarian': 'megállítás',
					'Polish': 'przerwij',
					'Romanian': 'oprire',
				},
				description: {
					'English': 'Stops the current listening session, clearing the queue and song history.',
					'Hungarian':
						'Véget vet az aktuális zenelejátszási alkalomnak, a várakozási sort és az előzményeket is törli.',
					'Polish': 'Przerywa obecną sesję słuchania muzyki.',
					'Romanian': 'Oprește sesiunea actuală de ascultare.',
				},
				strings: {
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
					'Hungarian': 'visszalépés',
					'Polish': 'przywróć',
					'Romanian': 'înapoiare',
				},
				description: {
					'English': 'Brings back the last played song.',
					'Hungarian': 'Visszatér a legutóbb játszott zenéhez.',
					'Polish': 'Przywraca ostatnio zagrany utwór lub zbiór utworów.',
					'Romanian': 'Înapoiază ultima melodie sau ultimul set de melodii redat.',
				},
				strings: {
					nowhereToUnskipTo: {
						'English': 'There is nowhere to unskip to.',
						'Hungarian': 'Innen nincs mihez visszalépni.',
						'Polish': 'Nie ma dokąd przewinąć spowrotem.',
						'Romanian': 'Nu este încotro a sări peste.',
					},
					noSongCollectionToUnskip: {
						'English': 'There is no song collection to unskip.\n\n' +
							'Try unskipping the current song instead.',
						'Hungarian': 'Nincs visszaléptethető zenegyűjtemény.\n\n' +
							'Helyette megpróbálhatod visszaléptetni az éppen játszott zenét.',
						'Polish': 'Nie ma zbioru utworów do przewinięcia.\n\n' +
							'Spróbuj przewinąć sam utwór.',
						'Romanian': 'Nu este un set de melodii de sărit peste.\n\n' +
							'Încearcă să sari peste melodia actuală.',
					},
					cannotUnskipDueToFullQueue: {
						'English': 'The last played song listing cannot be unskipped because the song queue is already full.',
						'Hungarian': 'Az utolsó elemet nem lehet visszahozni, mert a várakozási sor már megtelt.',
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
					'Hungarian': 'hangerő',
					'Polish': 'głośność',
					'Romanian': 'volum',
				},
				description: {
					'English': 'Allows the user to manage the volume of music playback.',
					'Hungarian': 'A zenelejátszás hangerejének állítását teszi lehetővé.',
					'Polish': 'Pozwala użytkownikowi na zarządzanie głośnością odtwarzania muzyki.',
					'Romanian': 'Permite utilizatorului gestionarea volumului redării muzicii.',
				},
				options: {
					display: {
						name: {
							'English': 'display',
							'Hungarian': 'megjelenítés',
							'Polish': 'wyświetl',
							'Romanian': 'afișare',
						},
						description: {
							'English': 'Displays the volume of playback.',
							'Hungarian': 'Megjeleníti a lejátszás hangerejét.',
							'Polish': 'Wyświetla głośność odtwarzania.',
							'Romanian': 'Afișează volumul redării.',
						},
						strings: {
							volume: {
								header: {
									'English': 'Volume',
									'Hungarian': 'Hangerő',
									'Polish': 'Głośność',
									'Romanian': 'Volum',
								},
								body: {
									'English': (volume: number) => `The current volume is ${volume}%.`,
									'Hungarian': (volume: number) => `A hangerő jelenleg ${volume}%.`,
									'Polish': (volume: number) => `Obecna głośność to ${volume}%.`,
									'Romanian': (volume: number) => `Volumul actual este ${volume}%.`,
								},
							},
						},
					},
					set: {
						name: {
							'English': 'set',
							'Hungarian': 'beállítás',
							'Polish': 'ustaw',
							'Romanian': 'setare',
						},
						description: {
							'English': 'Sets the volume of playback.',
							'Hungarian': 'Beállítja a lejátszás hangerejét.',
							'Polish': 'Ustawia głośność odtwarzania.',
							'Romanian': 'Setează volumul redării.',
						},
						options: {
							volume: (maxVolume: number) => ({
								name: {
									'English': 'volume',
									'Hungarian': 'hangerő',
									'Polish': 'głośność',
									'Romanian': 'volum',
								},
								description: {
									'English': `A number between 0 and ${maxVolume}.`,
									'Hungarian': `0 és ${maxVolume} közötti szám.`,
									'Polish': `Liczba między 0 i ${maxVolume}.`,
									'Romanian': `Un număr între 0 și ${maxVolume}.`,
								},
							}),
						},
						strings: {
							invalidVolume: {
								'English': (maxVolume: number) =>
									`Song volume may not be negative, and it may not be higher than ${maxVolume}%.`,
								'Hungarian': (maxVolume: number) => `A hangerő nem lehet sem negatív, sem több, mint ${maxVolume}%.`,
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
			notPlayingMusic: {
				'English': 'The bot is currently not playing music.',
				'Hungarian': 'A bot jelenleg nem játszik le zenét.',
				'Polish': 'Bot obecnie nie odtwarza muzyki.',
				'Romanian': 'Nu se redă muzică.',
			},
			listings: {
				'English': 'Listings',
				'Hungarian': 'Elemek',
				'Polish': 'Wpisy',
				'Romanian': 'Înregistrări',
			},
			listEmpty: {
				'English': 'This list is empty.',
				'Hungarian': 'Ez a lista üres.',
				'Polish': 'Ta lista jest pusta.',
				'Romanian': 'Această listă este goală.',
			},
			tooManySkipArguments: {
				'English': 'You may not skip __by__ a number of songs and skip __to__ a certain song in the same query.',
				'Hungarian': 'Az átugrás kétféle paramétere (hány elemet/melyik zenéhez) nem használható egyszerre.',
				'Polish': 'Nie można przewijać zarazem __o__ liczbę utworów i __do__ danego utworu w tym samym czasie.',
				'Romanian':
					'Nu se poate sări __peste__ un anumit număr de melodii și __la__ o anumită melodie în același timp.',
			},
			mustBeGreaterThanZero: {
				'English': 'The skip argument must be greater than zero.',
				'Hungarian': 'A paraméternek pozitív számnak kell lennie.',
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

	static readonly suggestion = typedLocalisations({
		name: {
			'English': 'suggestion',
			'Hungarian': 'javaslat',
			'Polish': 'sugestia',
			'Romanian': 'sugestie',
		},
		description: {
			'English': 'Passes a suggestion over to the server staff.',
			'Hungarian': 'Elküld egy javaslatot a szerver stábjának.',
			'Polish': 'Przekazuje sugestię moderacji serwera.',
			'Romanian': 'Transmite o sugestie personalului serverului.',
		},
		options: {
			suggestion: {
				name: {
					'English': 'suggestion',
					'Hungarian': 'tartalom',
					'Polish': 'sugestia',
					'Romanian': 'sugestie',
				},
				description: {
					'English': 'The suggestion to pass over to the server staff.',
					'Hungarian': 'A továbbítandó javaslat.',
					'Polish': 'Sugestia, która ma zostać przekazana moderacji serwera.',
					'Romanian': 'Sugestia care să fie transmisă personalului serverului.',
				},
			},
		},
		strings: {
			suggestionSent: {
				// Use exclamation if possible.
				header: {
					'English': 'Suggestion sent!',
					// TODO: Add Hungarian localisation.
					'Polish': 'Sugestia wysłana!',
					'Romanian': 'Sugestie trimisă!',
				},
				body: {
					'English': 'Your suggestion has been passed over to the server staff.',
					'Hungarian': 'A javaslat továbbításra került a szerver stábjához.',
					'Polish': 'Twoja sugestia została przekazana moderacji serwera.',
					'Romanian': 'Sugestia ta a fost transmisă personalului serverului.',
				},
			},
			failedToSendSuggestion: {
				'English': 'Failed to send suggestion.',
				// TODO: Add Hungarian localisation.
				'Polish': 'Nie udało się wysłać sugestii.',
				'Romanian': 'Nu s-a putut trimite sugestia.',
			},
			areYouSureToStopSubmitting: {
				'English': 'Are you sure you want to stop submitting the suggestion?',
				// TODO: Add Hungarian localisation.
				'Polish': 'Czy jesteś pewny/a, że chcesz anulować składanie sugestii?',
				'Romanian': 'Ești sigur/ă că vrei să anulezi depunerea sugestiei?',
			},
			waitBeforeSuggesting: {
				'English': 'You have already made a few suggestions recently.\n\n' +
					'You should wait before making a suggestion again.',
				// TODO: Add Hungarian localisation.
				'Polish': 'Zanim ponownie spróbujesz coś zasugerować, powinieneś/powinnaś troszeczkę poczekać.',
				'Romanian': 'Ar trebui să-ți iei puțin timp înainte de a încerca să depui din nou o sugestie.',
			},
		},
	});

	static readonly praise = typedLocalisations({
		name: {
			'English': 'praise',
			'Hungarian': 'dicséret',
			'Polish': 'pochwal',
			'Romanian': 'lăudare',
		},
		description: {
			'English': 'Praises a user for their contribution.',
			'Hungarian': 'Dicséretet ad egy felhasználónak a hozzájárulásáért.',
			'Polish': 'Chwali użytkownika za jego wkład.',
			'Romanian': 'Laudă un utilizator pentru contribuțiile sale.',
		},
		options: {
			comment: {
				name: {
					'English': 'comment',
					'Hungarian': 'komment',
					'Polish': 'komentarz',
					'Romanian': 'comentariu',
				},
				description: {
					'English': 'A comment to attach to the praise.',
					'Hungarian': 'A dicsérethez csatolható megjegyzés.',
					'Polish': 'Komentarz, który ma zostać załączony do pochwały.',
					'Romanian': 'Comentariul care să fie atașat la laudă.',
				},
				type: ApplicationCommandOptionTypes.String,
			},
		},
		strings: {
			cannotPraiseSelf: {
				'English': 'You cannot praise yourself.',
				'Hungarian': 'Nem dicsérheted meg saját magadat.',
				'Polish': 'Nie możesz pochwalić samego siebie.',
				'Romanian': 'Nu te poți lăuda pe tine însuți/însăți.',
			},
			failed: {
				'English': 'Failed to praise user.',
				'Hungarian': 'Nem sikerült kézbesíteni a dicséretet.',
				'Polish': 'Nie udało się pochwalić użytkownika.',
				'Romanian': 'Nu s-a putut lăuda utilizatorul.',
			},
			waitBeforePraising: {
				'English': 'You have already praised a user recently. You must wait before praising somebody again.',
				'Hungarian':
					'Nemrég már megdicsértél valakit. Várnod kell egy keveset, mielőtt újra használhatod ezt a funkciót.',
				'Polish': 'Zanim ponownie spróbujesz pochwalić użytkownika, powinieneś/powinnaś troszeczkę poczekać.',
				'Romanian': 'Ar trebui să-ți iei puțin timp înainte de a încerca să lauzi din nou un utilizator.',
			},
			praised: {
				'English': (userMention: string) =>
					`Unless ${userMention} has their DMs closed, they have just been notified that you have praised them.`,
				'Hungarian': (userMention: string) =>
					`${userMention} most kapta meg az értesítését a dicséretről (kivéve, ha letiltotta a DM-eket).`,
				'Polish': (userMention: string) =>
					`Jeśli ${userMention} nie zablokował swoich DM-ów, właśnie został/a powiadomiony/a o pochwale.`,
				'Romanian': (userMention: string) =>
					`Cu excepția că ${userMention} și-a blocat DM-urile sale, tocmai ce a fost notificat că l-ai lăudat.`,
			},
			praisedDirect: {
				'English': (userMention: string) => `You have just been praised by ${userMention}!`,
				'Hungarian': (userMention: string) => `${userMention} dicséretet küldött neked!`,
				'Polish': (userMention: string) => `Użytkownik ${userMention} właśnie Cię pochwalił!`,
				'Romanian': (userMention: string) => `Abia ce ai primit o laudă de la ${userMention}!`,
			},
		},
	});

	static readonly profile = typedLocalisations({
		name: {
			'English': 'profile',
			'Hungarian': 'profil',
			'Polish': 'profil',
			'Romanian': 'profil',
		},
		description: {
			'English': 'Allows the user to view information about themselves or another user.',
			'Hungarian': 'Egy felhasználó adatainak lekérését teszi lehetővé.',
			'Polish': 'Pozwala użytkownikowi na wyświetlanie informacji o sobie lub o innych użytkownikach.',
			'Romanian': 'Permite utilizatorului afișarea informațiilor despre sine sau despre alți utilizatori.',
		},
		options: {
			roles: {
				name: {
					'English': 'roles',
					'Hungarian': 'rangok',
					'Polish': 'role',
					'Romanian': 'roluri',
				},
				description: {
					'English': 'Opens the role selection menu.',
					'Hungarian': 'Megnyitja a rangválasztó menüt.',
					'Polish': 'Otwiera menu wybierania ról.',
					'Romanian': 'Deschide meniul selectării rolurilor.',
				},
				strings: {
					selectCategory: {
						header: {
							'English': 'No category selected',
							'Hungarian': 'Nincs kiválasztott kategória',
							'Polish': 'Nie wybrano kategorii',
							'Romanian': 'Nicio categorie selectată',
						},
						body: {
							'English': 'Select a category to obtain the list of available roles for it.',
							'Hungarian': 'Válassz ki egy kategóriát, hogy lásd az elérhető rangokat benne.',
							'Polish': 'Wybierz kategorię, aby otrzymać listę dostępnych dla niej ról.',
							'Romanian': 'Selectează o categorie pentru a primi lista cu rolurile disponibile pentru aceasta.',
						},
					},
					reachedLimit: {
						'English': (categoryName: string) =>
							`You have reached the limit of roles you can assign from within the '${categoryName}' category.` +
							'To choose a new role, unassign one of your existing roles.',
						'Hungarian': (categoryName: string) =>
							`Elérted a(z) '${categoryName}' kategóriából kiválasztható rangok korlátját.` +
							'Új rang felvételéhez adj le egy másik meglévő rangot.',
						'Polish': (categoryName: string) =>
							`Dosięgnąłeś/as limitu ról które mogłeś uzyskać z kategorii '${categoryName}'.` +
							'Aby wybrać rolę inną od tych, które już masz, usuń jedną z istniejących ról.',
						'Romanian': (categoryName: string) =>
							`Ai atins limita rolurilor pe care le poți obține din cadrul categoriei '${categoryName}'.` +
							'Pentru a alege un rol nou, dezasociază unul dintre rolurile existente.',
					},
					cannotUnassignRole: {
						'English': 'You cannot unassign this role. You can only exchange it for another.',
						// TODO: Hungarian localisation.
						'Polish': 'Nie możesz usunąć tej rangi, możesz ją tylko wymienić na inną.',
						'Romanian': 'Nu se poate elimina acest rol, este posibil doar să o schimbi cu alta. ',
					},
					chooseCategory: {
						'English': 'Choose a category.',
						'Hungarian': 'Válassz egy kategóriát.',
						'Polish': 'Wybierz kategorię.',
						'Romanian': 'Alege o categorie.',
					},
					chooseRole: {
						'English': 'Choose a role.',
						'Hungarian': 'Válassz egy rangot.',
						'Polish': 'Wybierz rolę.',
						'Romanian': 'Alege un rol.',
					},
					back: {
						'English': 'Back',
						'Hungarian': 'Vissza',
						'Polish': 'Wstecz',
						'Romanian': 'Înapoi',
					},
					assigned: {
						'English': 'Assigned',
						'Hungarian': 'Felvéve',
						'Polish': 'Przydzielono',
						'Romanian': 'Atribuit',
					},
				},
			},
			view: {
				name: {
					'English': 'view',
					'Hungarian': 'megtekintés',
					'Polish': 'wyświetl',
					'Romanian': 'afișare',
				},
				description: {
					'English': 'Displays a user\'s profile.',
					'Hungarian': 'A megadott felhasználó profilját jeleníti meg.',
					'Polish': 'Wyświetla profil użytkownika.',
					'Romanian': 'Afișează profilul unui utilizator.',
				},
				strings: {
					failed: {
						'English': 'Failed to show information about the chosen member.',
						'Hungarian': 'Nem sikerült megjeleníteni információt a kiválasztott tagról.',
						'Polish': 'Nie udało się wyświetlić informacji o danym członku.',
						'Romanian': 'Nu s-au putut afișa informații despre membrul dat.',
					},
					informationForUser: {
						'English': (username: string) => `Information about ${username}`,
						'Hungarian': (username: string) => `Információ – ${username}`,
						'Polish': (username: string) => `Informacje o użytkowniku ${username}`,
						'Romanian': (username: string) => `Informații despre ${username}`,
					},
					roles: {
						'English': 'Roles',
						'Hungarian': 'Rangok',
						'Polish': 'Role',
						'Romanian': 'Roluri',
					},
					dates: {
						'English': 'Dates',
						'Hungarian': 'Dátumok',
						'Polish': 'Dat',
						'Romanian': 'Date',
					},
					statistics: {
						'English': 'Statistics',
						'Hungarian': 'Statisztika',
						'Polish': 'Statystyki',
						'Romanian': 'Statistici',
					},
					received: {
						'English': 'Received',
						'Hungarian': 'Kapott',
						'Polish': 'Otrzymano',
						'Romanian': 'Primite',
					},
					sent: {
						'English': 'Sent',
						'Hungarian': 'Küldött',
						'Polish': 'Wysłano',
						'Romanian': 'Trimise',
					},
					praises: {
						'English': 'Praises',
						'Hungarian': 'Dicséretek',
						'Polish': 'Pochwały',
						'Romanian': 'Lăudări',
					},
					warnings: {
						'English': 'Warnings',
						'Hungarian': 'Figyelmeztetések',
						'Polish': 'Ostrzeżenia',
						'Romanian': 'Avertizări',
					},
				},
			},
		},
	});
}

export { Commands };
