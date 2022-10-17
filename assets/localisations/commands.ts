import { User } from '../../deps.ts';
import { links } from '../../src/constants.ts';
import { capitalise, list } from '../../src/formatting.ts';
import { CommandLocalisations } from './types.ts';

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
					whatAmI: {
						header: {
							'English': 'What am I?',
							'Polish': 'Czym jestem?',
							'Romanian': 'Ce sunt?',
						},
						body: {
							'English': (botUser: User) =>
								`I am **${botUser.username}**, an application created to offer language-learning Discord communities with the highest quality features, such as:
              ${
									list([
										'Rich social interactions',
										'Intuitive role management',
										'Translation and morphology look-ups',
										'Music playback',
										'Article creation',
										'Server structure synchronisation',
									])
								}`,
							'Polish': (botUser: User) =>
								`Jestem **${botUser.username}**, aplikacją stworzoną dla zaoferowania społecznościom Discord do nauki języków obcych najwyższej jakości funkcje, takie jak:
              ${
									list([
										'Bogate interakcje socjalne',
										'Intuitywne wybieranie ról',
										'Tłumaczenia, wyszukiwanie znaczeń oraz innych informacji o słowach',
										'Odtwarzanie muzyki',
										'Tworzenie oraz czytanie artykułów lingwistycznych',
										'Synchronizacja struktury serwera',
									])
								}`,
							'Romanian': (botUser: User) =>
								`Sunt **${botUser.username}**, o aplicație creată pentru a oferi comunităților Discord de învățat limbile străine funcții de cea mai înaltă calitate, cum ar fi:
              ${
									list([
										'Interacțiuni sociale bogate',
										'Gestionarea intuitivă a rolurilor',
										'Traduceri și căutarea cuvintelor',
										'Redarea muzicii',
										'Crearea și citirea articolelor lingvistice',
										'Sincronizarea structurii serverului',
									])
								}`,
						},
					},
					howWasIMade: {
						header: {
							'English': 'How was I made?',
							'Polish': 'Jak zostałem stworzony?',
							'Romanian': 'Cum am fost creat?',
						},
						body: {
							'English':
								`I am powered by [TypeScript](${links.typescriptWebsite}) running within [Deno](${links.denoWebsite}). I interact with [Discord\'s API](${links.discordApiWebsite}) with the help of the [discordeno](${links.discordenoRepository}) library.`,
							'Polish':
								`Jestem zasilany przez [TypeScript](${links.typescriptWebsite}), działający w ramach [Deno](${links.denoWebsite}). Współdziałam z [API Discorda](${links.discordApiWebsite}) za pomocą biblioteki [discordeno](${links.discordenoRepository}).`,
							'Romanian':
								`Sunt alimentat de către [TypeScript](${links.typescriptWebsite}), care rulează în cadrul [Deno](${links.denoWebsite}). Interacționez cu [API-ul Discord-ului](${links.discordApiWebsite}) cu ajutorul bibliotecii [discordeno](${links.discordenoRepository}).`,
						},
					},
					howToAddToServer: {
						header: {
							'English': 'How can you add me to your server?',
							'Polish': 'Jak można dodać mnie na swój serwer?',
							'Romanian': 'Cum pot fi adăugat pe server?',
						},
						body: {
							'English':
								`You cannot just yet. I was made for the purpose of managing a select few language-learning communities, such as [Learn Armenian](${links.learnArmenianListingWebsite}) and [Learn Romanian](${links.learnRomanianListingWebsite}).`,
							'Polish':
								`Jeszcze nie można. Zostałem stworzony w celu zarządzania kilkoma wybranymi społecznościami językowymi, takimi jak [Learn Armenian](${links.learnArmenianListingWebsite}) lub [Learn Romanian](${links.learnRomanianListingWebsite}).`,
							'Romanian':
								`Nu se poate încă. Am fost creat cu scopul de a gestiona câteva comunități selecte de învățare a limbilor străine, cum ar fi [Learn Armenian](${links.learnArmenianListingWebsite}) sau [Learn Romanian](${links.learnRomanianListingWebsite}).`,
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
								`Niestety nie. Jednakże, kod źródłowy mojego poprzednika, Talona, *jest* publiczny. Można zajrzeć w jego kod źródłowy [tutaj](${links.talonRepositoryLink}).`,
							'Romanian':
								`Nu, din păcate. Deși, codul-sursă al predecesorului meu, lui Talon, *este* public. Îl puteți vedea [aici](${links.talonRepositoryLink}).`,
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
						'English': (guildName: string) =>
							`Information about **${guildName}**`,
						'Polish': (guildName: string) => `Informacje o **${guildName}**`,
						'Romanian': (guildName: string) =>
							`Informații despre **${guildName}**`,
					},
					noDescription: {
						'English': 'No description provided.',
						'Polish': 'Bez opisu.',
						'Romanian': 'Fără descriere.',
					},
					overseenByModerators: {
						'English': (moderatorRoleName: string) =>
							`This server is overseen by a collective of ${moderatorRoleName}s.`,
						'Polish': (moderatorRoleName: string) =>
							`Ten serwer jest nadzorowany poprzez grupę osób z rolą **${
								capitalise(moderatorRoleName)
							}**.`,
						'Romanian': (moderatorRoleName: string) =>
							`Acest server este supravegheat de cătr-un grup de oameni cu rolul **${
								capitalise(moderatorRoleName)
							}**.`,
					},
					withoutProficiencyRole: {
						'English': 'without a proficiency role.',
						'Polish': 'bez roli biegłości',
						'Romanian': 'fără un rol de proficiență.',
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
							'Romanian': 'Properietarul',
						},
						moderators: {
							'English': 'Moderators',
							'Polish': 'Moderatorzy',
							'Romanian': 'Moderatori',
						},
						proficiencyDistribution: {
							'English': 'Proficiency Distribution',
							'Polish': 'Dystrybucja Biegłości',
							'Romanian': 'Distribuție de Proficiență',
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
			'Romanian':
				'Alege cuvântul care se potrivește cu spațiul gol în propoziție.',
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
				'English':
					'There are no sentences available in the requested language.',
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
			clickForResources: {
				'English': 'Click here for resources',
				'Polish': 'Kliknij tutaj dla zasobów',
				'Romanian': 'Dă clic aici pentru resurse',
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
			'English':
				'Translates a text from the source language to the target language.',
			'Polish': 'Tłumaczy dany tekst z języka źródłowego na język docelowy.',
			'Romanian': 'Traduce un text dat din limbă-sursă în limbă-țintă.',
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
				'English':
					'The target language may not be the same as the source language.',
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
			'Romanian': 'Afișează informații despre un cuvânt dat.',
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
					'English':
						'If set to true, more (perhaps unnecessary) information will be shown.',
					'Polish':
						'Jeśli tak, więcej (możliwie niepotrzebnych) informacji będzie pokazanych.',
					'Romanian':
						'Dacă da, mai multe (posibil inutile) informații vor fi afișate.',
				},
			},
		},
		strings: {
			noDictionaryAdapters: {
				'English':
					'There are no dictionaries available in the requested language.',
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
			'Romanian': 'Citează una dintre regulile serverului.',
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
					'Romanian':
						'Afișează avertizările care au fost date unui utilizator.',
				},
			},
		},
		strings: {
			warningsUnableToBeShown: {
				'English': 'The warnings for the given user could not be shown.',
				'Polish': 'Nie udało się wyświetlić ostrzeżeń dla danego użytkownika.',
				'Romanian':
					'Avertizările pentru utilizatorul dat nu au putut fi afișate.',
			},
			userDoesNotHaveWarnings: {
				'English': 'This user has not received any warnings.',
				'Polish': 'Ten użytkownik nigdy nie dostał ostrzeżenia.',
				'Romanian': 'Acest utilizator niciodată nu a primit o avertizare.',
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
			'Romanian':
				'Comandă utilizată pentru gestionarea pauzelor utilizatorilor.',
		},
		options: {
			set: {
				name: {
					'English': 'set',
					'Polish': 'ustaw',
					'Romanian': 'setare',
				},
				description: {
					'English':
						'Times out a user, making them unable to interact on the server.',
					'Polish':
						'Wycisza użytkownika, uniemożliwiając mu interakcję z serwerem (pisanie, mówienie w VC, itp.).',
					'Romanian':
						'Face ca un utilizator să nu mai poată interacționa în server.',
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
					'Polish':
						'Umożliwia użytkownikowi, który został wyciszony, ponowną interakcję z serwerem.',
					'Romanian':
						'Permite utilizatorului care a primit un timeout să interacționeze cu serverul.',
				},
			},
		},
		strings: {
			cannotTimeoutSelf: {
				'English': 'You cannot time yourself out.',
				'Polish': 'Nie można wyciszyć siebie samego.',
				'Romanian': 'Nu îți poți seta însuți o pauză.',
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
					`User ${userMention} has been timed out until ${until}.`,
				'Polish': (userMention: string, until: string) =>
					`Użytkownik ${userMention} został wyciszony do ${until}.`,
				'Romanian': (userMention: string, until: string) =>
					`Utilizatorul ${userMention} a primit un timeout care va dura până la ${until}.`,
			},
			timedOutWithReason: {
				'English': (userMention: string, until: string, reason: string) =>
					`User ${userMention} has been timed out until ${until} for: ${reason}`,
				'Polish': (userMention: string, until: string, reason: string) =>
					`Użytkownik ${userMention} został wyciszony do ${until} za: ${reason}`,
				'Romanian': (userMention: string, until: string, reason: string) =>
					`Utilizatorul ${userMention} a primit un timeout care va dura până la ${until} pentru: ${reason}`,
			},
			timedOutDirect: {
				'English': (until: string, reason: string) =>
					`You have been timed out until ${until} for: ${reason}`,
				'Polish': (until: string, reason: string) =>
					`Zostałeś/aś wyciszony/a do ${until} za: ${reason}`,
				'Romanian': (until: string, reason: string) =>
					`Ai primit un timeout care va dura până la ${until} pentru: ${reason}`,
			},
			notTimedOut: {
				'English': 'The provided user is not currently timed out.',
				'Polish': 'Ten użytkownik nie jest wyciszony.',
				'Romanian': 'Acest utilizator nu a avut o pauză impusă pe el.',
			},
			timeoutCleared: {
				'English': (userMention: string) =>
					`User ${userMention} is no longer timed out.`,
				'Polish': (userMention: string) =>
					`Użytkownik ${userMention} już nie jest wyciszony.`,
				'Romanian': (userMention: string) =>
					`Utilizatorul ${userMention} nu mai are o pauză.`,
			},
		},
	});

	static readonly unwarn = typedLocalisations({
		name: {
			'English': 'pardon',
			'Polish': 'ułaskawienie',
			'Romanian': 'grațiere',
		},
		description: {
			'English': 'Removes the last given warning to a user.',
			'Polish': 'Usuwa ostatnie ostrzeżenie dane użytkownikowi.',
			'Romanian': 'Șterge ultima avertizare dat unui utilizator.',
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
			pardonedDirect: {
				'English': (reason: string, relativeTime: string) =>
					`You have been pardoned from the warning for '${reason}' given to you ${relativeTime}.`,
				'Polish': (reason: string, relativeTime: string) =>
					`Ostrzeżenie za '${reason}' dane Tobie ${relativeTime} zostało wycofane.`,
				'Romanian': (reason: string, relativeTime: string) =>
					`Avertizarea pentru '${reason}' care a fost dată ție ${relativeTime} a fost anulată.`,
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
				'Romanian':
					'Nu se pot avertiza nici boții, nici moderatorii de server.',
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
			passedWarningLimitDirect: {
				'English': (reason: string) =>
					`You have been warned for: ${reason}\n\nYou have surpassed the maximum number of warnings, and have subsequently been kicked from the server.`,
				'Polish': (reason: string) =>
					`Zostałeś/aś ostrzeżony/a za: ${reason}\n\nPrzekroczyłeś/aś maksymalną liczbę ostrzeżeń, więc zostałeś/aś wyrzucony/a z serwera.`,
				'Romanian': (reason: string) =>
					`Ai fost avertizat/ă pentru: ${reason}\n\nAi depășit limita de avertizări, așa că ai fost dat/ă afară de pe server.`,
			},
			warnedDirect: {
				'English': (
					reason: string,
					warningCount: number,
					warningLimit: number,
				) =>
					`You have been warned for: ${reason}\n\nThis was warning #${warningCount} of ${warningLimit}.`,
				'Polish': (
					reason: string,
					warningCount: number,
					warningLimit: number,
				) =>
					`Zostałeś/aś ostrzeżony/a za: ${reason}\n\nTo było ostrzeżenie #${warningCount} z ${warningLimit}.`,
				'Romanian': (
					reason: string,
					warningCount: number,
					warningLimit: number,
				) =>
					`Ai fost avertizat/ă pentru: ${reason}\n\nAsta a fost avertizarea #${warningCount} din ${warningLimit}.`,
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
			'Polish':
				'Pozwala użytkownikowi na zarządanie odtwarzaniem muzyki w kanale głosowym.',
			'Romanian':
				'Permite utilizatorului gestionarea redării muzicii într-un canal de voce.',
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
					'Romanian':
						'Afișează melodia sau setul de melodii în curs de redare.',
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
					'Romanian':
						'Pauzează melodia sau setul de melodii în curs de redare.',
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
					'Polish':
						'Pozwala użytkownikowi na odtwarzanie muzyki w kanale głosowym.',
					'Romanian':
						'Permite utilizatorului să redea muzică într-un canal de voce.',
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
			noSongPlaying: {
				'English': 'There is no song to display the details of.',
				'Polish':
					'Nie można wyświetlić informacji o utworze, ponieważ żaden utwór obecnie nie jest odtwarzany.',
				'Romanian':
					'Nu s-au putut afișa informații despre melodie fiindcă în prezent nu se redă nicio melodie.',
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
				'English': (origin: string | undefined) =>
					`This listing was sourced from ${origin ?? 'the internet'}.`,
				'Polish': (origin: string | undefined) =>
					`Ten wpis został pobrany z ${origin ?? 'internetu'}.`,
				'Romanian': (origin: string | undefined) =>
					`Această înregistrare a fost furnizată de pe ${
						origin ?? 'internet'
					}.`,
			},
			noSongToPause: {
				'English': 'There is no song to pause.',
				'Polish': 'Nie ma utworu do zapauzowania.',
				'Romanian': 'Nu este o melodie pentru a o pauza.',
			},
			paused: {
				header: {
					'English': 'Paused',
					'Polish': 'Zapauzowane',
					'Romanian': 'În pauză',
				},
				body: {
					'English': 'The current song has been paused.',
					'Polish': 'Zapauzowano odtwarzanie utworu.',
					'Romanian': 'A fost oprită redarea melodiei.',
				},
			},
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
		},
	});
}

export { Commands };
