import { ApplicationCommandOptionTypes, User } from '../../deps.ts';
import { links } from '../../src/constants.ts';
import configuration from '../../src/configuration.ts';
import { capitalise, list } from '../../src/formatting.ts';
import { CommandLocalisations, localise } from './types.ts';
import { getLocale, getLocalisations, TranslationLanguage } from './languages.ts';
import { Expressions } from './expressions.ts';
import { Language } from '../../src/types.ts';

function typedLocalisations<
	OptionKeys extends string,
	StringKeys extends string,
	OptionsType extends Record<OptionKeys, any> | undefined,
	StringsType extends Record<StringKeys, any> | undefined,
>(
	localisations: CommandLocalisations<
		OptionKeys,
		StringKeys,
		OptionsType,
		StringsType
	>,
): CommandLocalisations<
	OptionKeys,
	StringKeys,
	OptionsType,
	StringsType
> {
	return localisations;
}

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
							'English': (botUser: User) =>
								`I am **${botUser.username}**, an application created to offer language-learning Discord communities with the highest quality features, such as:
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
							'Polish': (botUser: User) =>
								`Nazywam się **${botUser.username}**. Jestem aplikacją stworzoną do zaoferowania społecznościom języcznym na Discordzie najwyższej jakości funkcji, takich jak:
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
							'Romanian': (botUser: User) =>
								`Mă numesc **${botUser.username}**. Sunt o aplicație creată pentru a oferi comunităților lingvistice Discord funcții de cea mai înaltă calitate, cum ar fi:
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
						body: {
							'English':
								`I am powered by [${configuration.interactions.responses.emojis.typescript} TypeScript](${links.typescriptWebsite}) running within [${configuration.interactions.responses.emojis.deno} Deno](${links.denoWebsite}). I interact with [Discord\'s API](${links.discordApiWebsite}) with the help of the [${configuration.interactions.responses.emojis.discordeno} discordeno](${links.discordenoRepository}) library.`,
							'Polish':
								`Jestem zasilany przez [${configuration.interactions.responses.emojis.typescript} TypeScript](${links.typescriptWebsite}), działający w ramach [${configuration.interactions.responses.emojis.deno} Deno](${links.denoWebsite}). Współdziałam z [API Discorda](${links.discordApiWebsite}) za pomocą biblioteki [${configuration.interactions.responses.emojis.discordeno} discordeno](${links.discordenoRepository}).`,
							'Romanian':
								`Sunt alimentat de către [${configuration.interactions.responses.emojis.typescript} TypeScript](${links.typescriptWebsite}), care se execută în cadrul [${configuration.interactions.responses.emojis.deno} Deno](${links.denoWebsite}). Interacționez cu [API-ul Discord-ului](${links.discordApiWebsite}) cu ajutorul bibliotecii [${configuration.interactions.responses.emojis.discordeno} discordeno](${links.discordenoRepository}).`,
						},
					},
					howToAddToServer: {
						header: {
							'English': 'How can you add me to your server?',
							'Polish': 'Jak można dodać mnie na własny serwer?',
							'Romanian': 'Cum poți să mă adaugi pe serverul tău?',
						},
						body: {
							'English':
								`It is not possible at this point in time. I was made for the purpose of managing a select few language-learning communities, such as [🇦🇲 Learn Armenian](${links.learnArmenianListingWebsite}) and [🇷🇴 Learn Romanian](${links.learnRomanianListingWebsite}).`,
							'Polish':
								`Na chwilę obecną nie można tego zrobić. Zostałem stworzony w celu zarządzania kilkoma wybranymi społecznościami językowymi, takimi jak [🇦🇲 Learn Armenian](${links.learnArmenianListingWebsite}) oraz [🇷🇴 Learn Romanian](${links.learnRomanianListingWebsite}).`,
							'Romanian':
								`La acest moment asta nu este posibil. Am fost creat cu scopul de a nu gestiona decât câteva comunități lingvistice selecte, cum ar fi [🇦🇲 Learn Armenian](${links.learnArmenianListingWebsite}) și [🇷🇴 Learn Romanian](${links.learnRomanianListingWebsite}).`,
						},
					},
					amIOpenSource: {
						header: {
							'English': 'Am I open-source?',
							'Polish': 'Czy mój kod źródłowy jest publiczny?',
							'Romanian': 'Sunt open-source?',
						},
						body: {
							'English':
								`Unfortunately, no. However, my predecessor, Talon, *is*. You can view his source code [here](${links.talonRepositoryLink}).`,
							'Polish':
								`Niestety nie, chociaż kod źródłowy mojego poprzednika, Talona, jest publiczny. Można zajrzeć w jego kod źródłowy [o tu](${links.talonRepositoryLink}).`,
							'Romanian':
								`Nu, din păcate. Deși, codul-sursă al predecesorului meu, al lui Talon, este public. Îl puteți vedea [chiar aici](${links.talonRepositoryLink}).`,
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
						'English': 'without a specified proficiency.',
						'Polish': 'bez określonej biegłości.',
						'Romanian': 'fără o competență specifizată.',
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
						serverOwner: {
							'English': 'Server Owner',
							'Polish': 'Właściciel Serwera',
							'Romanian': 'Properietarul Serverului',
						},
						moderators: {
							'English': 'Moderators',
							'Polish': 'Moderatorzy',
							'Romanian': 'Moderatori',
						},
						proficiencyDistribution: {
							'English': 'Proficiency Distribution',
							'Polish': 'Dystrybucja Biegłości',
							'Romanian': 'Distribuție de Competență',
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
			'Romanian': 'Alege cuvântul care se potrivește cu spațiul gol în propoziție.',
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
			resourcesStoredHere: {
				'English': (language: Language) =>
					`Resources for learning ${localise(getLocalisations(language), 'English')} are stored here`,
				'Polish': (language: Language) =>
					`Zasoby do nauki ${
						Expressions.polish.cases.genitive.languages[language].toLowerCase()
					} są przechowywane tutaj`,
				'Romanian': (language: Language) =>
					`Resursele pentru învățatul limbii ${
						Expressions.romanian.cases.genitive.indefinite.languages[language]
					} sunt stocate aici`,
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
			sourceLanguage: {
				'English': (languageName: TranslationLanguage) =>
					localise(getLocalisations(languageName), getLocale('English')),
				'Polish': (languageName: TranslationLanguage) => Expressions.polish.cases.genitive.languages[languageName],
				'Romanian': (languageName: TranslationLanguage) =>
					localise(getLocalisations(languageName), getLocale('Romanian')),
			},
			targetLanguage: {
				'English': (languageName: TranslationLanguage) =>
					localise(getLocalisations(languageName), getLocale('English')),
				'Polish': (languageName: TranslationLanguage) => localise(getLocalisations(languageName), getLocale('Polish')),
				'Romanian': (languageName: TranslationLanguage) =>
					localise(getLocalisations(languageName), getLocale('Romanian')),
			},
			sourceText: {
				'English': 'Source Text',
				'Polish': 'Tekst Źródłowy',
				'Romanian': 'Textul-sursă',
			},
			translation: {
				'English': 'Translation',
				'Polish': 'Tłumaczenie',
				'Romanian': 'Traducerea',
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
				translation: {
					'English': 'Translation',
					'Polish': 'Tłumaczenie',
					'Romanian': 'Traducere',
				},
				pronunciation: {
					'English': 'Pronunciation',
					'Polish': 'Wymowa',
					'Romanian': 'Pronunțare',
				},
				definition: {
					'English': 'Definition',
					'Polish': 'Znaczenie',
					'Romanian': 'Definiție',
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
			},
		},
	});

	static readonly cite = typedLocalisations({
		name: {
			'English': 'cite',
			'Polish': 'zacytuj',
			'Romanian': 'citare',
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
			warningsUnableToBeShown: {
				'English': 'The warnings for the given user could not be shown.',
				'Polish': 'Nie udało się wyświetlić ostrzeżeń dla danego użytkownika.',
				'Romanian': 'Avertizările pentru utilizatorul dat nu au putut fi afișate.',
			},
			userDoesNotHaveWarnings: {
				'English': 'This user has not received any warnings.',
				'Polish': 'Ten użytkownik jeszcze nie dostał ostrzeżenia.',
				'Romanian': 'Acest utilizator nu a primit încă o avertizare.',
			},
			warnings: {
				'English': 'Warnings',
				'Polish': 'Ostrzeżenia',
				'Romanian': 'Avertizări',
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
					`User ${userMention} has been timed out. The timeout will expire ${until}.`,
				'Polish': (userMention: string, until: string) =>
					`Użytkownik ${userMention} został wyciszony. Wyciszenie wygaśnie ${until}.`,
				'Romanian': (userMention: string, until: string) =>
					`Utilizatorul ${userMention} a primit un timeout. Timeout-ul va expira ${until}.`,
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

	static readonly pardon = typedLocalisations({
		name: {
			'English': 'pardon',
			'Polish': 'ułaskaw',
			'Romanian': 'grațiere',
		},
		description: {
			'English': 'Removes the last given warning to a user.',
			'Polish': 'Usuwa ostatnie ostrzeżenie dane użytkownikowi.',
			'Romanian': 'Șterge ultima avertizare dată unui utilizator.',
		},
		options: {
			warning: {
				name: {
					'English': 'warning',
					'Polish': 'ostrzeżenie',
					'Romanian': 'avertizare',
				},
				description: {
					'English': 'The warning to remove.',
					'Polish': 'Ostrzeżenie, które ma zostać usunięte.',
					'Romanian': 'Avertizarea care să fie ștearsă.',
				},
			},
		},
		strings: {
			failed: {
				'English': 'Failed to remove warning.',
				'Polish': 'Nie udało się usunąć ostrzeżenia.',
				'Romanian': 'Nu s-a putut elimina avertizarea.',
			},
			alreadyRemoved: {
				'English': 'The selected warning has already been removed.',
				'Polish': 'To ostrzeżenie już zostało usunięte.',
				'Romanian': 'Avertizarea selectată a fost deja eliminată.',
			},
			pardoned: {
				'English': (userMention: string, reason: string) =>
					`User ${userMention} has been pardoned from their warning for: ${reason}`,
				'Polish': (userMention: string, reason: string) =>
					`Użytkownik ${userMention} został ułaskawiony z jego ostrzeżenia za: ${reason}`,
				'Romanian': (userMention: string, reason: string) =>
					`Utilizatorul ${userMention} a fost grațiat de avertizarea sa pentru: ${reason}`,
			},
			// Do not localise; this is a public feedback message.
			pardonedDirect: {
				'English': (reason: string, relativeTime: string) =>
					`You have been pardoned from the warning given to you ${relativeTime}.\n\n` +
					`This warning was given to you for: ${reason}`,
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
					`User ${userMention} has been warned. They now have ${warningCount} warnings.`,
				'Polish': (userMention: string, warningCount: number) =>
					`Użytkownik ${userMention} został ostrzeżony. Razem ostrzeżeń: ${warningCount}.`,
				'Romanian': (userMention: string, warningCount: number) =>
					`Utilizatorul ${userMention} a fost avertizat. Avertizări în total: ${warningCount}.`,
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
					sourcedFrom: {
						'English': (origin: string | undefined) => `This listing was sourced from ${origin ?? 'the internet'}.`,
						'Polish': (origin: string | undefined) => `Ten wpis został pobrany z ${origin ?? 'internetu'}.`,
						'Romanian': (origin: string | undefined) =>
							`Această înregistrare a fost furnizată de pe ${origin ?? 'internet'}.`,
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
					// Do not localise; this is a public feedback message.
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
					// Do not localise; this is a public feedback message.
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
					// Do not localise; this is a public feedback message.
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
					// Do not localise; this is a public feedback message.
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
					// Do not localise; this is a public feedback message.
					skipped: {
						header: { 'English': 'Skipped' },
						body: {
							'English': (skipCollection: boolean) =>
								`The ${!skipCollection ? 'song' : 'song collection'} has been skipped.`,
						},
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
					// Do not localise; this is a public feedback message.
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
					// Do not localise; this is a public feedback message.
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
							// Do not localise; this is a public feedback message.
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
			// Do not localise; this is a public feedback message.
			allDone: {
				header: {
					'English': 'All done!',
				},
				body: {
					'English': 'Can I go home for today?',
				},
			},
			// Do not localise; this is a public feedback message.
			couldNotLoadTrack: {
				header: {
					'English': 'Couldn\'t load track',
				},
				body: {
					'English': (songTitle: string) => `The track, **${songTitle}**, could not be loaded.`,
				},
			},
			// Do not localise (not even 'parts'); this is a public feedback message.
			playing: {
				header: {
					'English': 'Now playing',
				},
				body: {
					'English': (
						displayTrack: string,
						songTitle: string,
						songUrl: string,
						userMention: string,
					) => `Now playing ${displayTrack} [**${songTitle}**](${songUrl}) as requested by ${userMention}.`,
				},
				parts: {
					displayTrack: {
						'English': (
							position: number,
							songCount: number,
							listingTitle: string,
						) => `track **${position}/${songCount}** of **${listingTitle}**: `,
					},
				},
			},
		},
	});

	static readonly post = typedLocalisations({
		name: {
			'English': 'post',
			'Polish': 'wstaw',
			'Romanian': 'postare',
		},
		description: {
			'English': 'Allows the user to post various core server messages, such as the server rules.',
			'Polish': 'Pozwala użytkownikowi na wstawianie różnych wiadomości serwerowych, takich jak regulamin.',
			'Romanian': 'Permite utilizatorului postarea diverselor mesaje de server, precum regulamentul.',
		},
		options: {
			information: {
				name: {
					'English': 'rules',
					'Polish': 'regulamin',
					'Romanian': 'regulament',
				},
				description: {
					'English': 'Posts a message containing the server rules.',
					'Polish': 'Wstawia wiadomość zawierającą regulamin.',
					'Romanian': 'Postează un mesaj care conține regulamentul.',
				},
				strings: {
					posted: {
						'English': 'Rules posted.',
						'Polish': 'Reguły opublikowane.',
						'Romanian': 'Reguli publicate.',
					},
				},
			},
			welcome: {
				name: {
					'English': 'welcome',
					'Polish': 'powitanie',
					'Romanian': 'bun-venit',
				},
				description: {
					'English': 'Posts a message containing the welcome message.',
					'Polish': 'Wstawia wiadomość zawierającą powitanie dla nowych członków serwera.',
					'Romanian': 'Postează un mesaj care conține un bun-venit pentru membri noi ai serverului.',
				},
				strings: {
					// Do not localise; this is a public feedback message.
					welcome: {
						header: {
							'English': (guildName: string) => `Welcome to **${guildName}**`,
						},
						body: {
							'English': (channelMention: string) =>
								`To enter the server and become its official member, read the information in the ${channelMention} channel to get yourself familiarised with the server guidelines, and then press the button below.`,
						},
					},
					// Do not localise; this is a public feedback message.
					// No full stop here.
					acceptedRules: {
						'English': 'I have read the rules, and agree to abide by them',
					},
					posted: {
						'English': 'Welcome posted.',
						'Polish': 'Powitanie opublikowane.',
						'Romanian': 'Bun-venit publicat.',
					},
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
