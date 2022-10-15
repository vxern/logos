import { User } from '../../deps.ts';
import { links } from '../../src/constants.ts';
import { capitalise, list } from '../../src/formatting.ts';
import { CommandLocalisations, DiscordLocalisations } from './types.ts';

class GlobalParameters {
	static readonly elements: DiscordLocalisations = {
		name: {
			'English': 'number',
			'Polish': 'liczba',
			'Romanian': 'număr',
		},
		description: {
			'English': 'The number of elements to manage.',
			'Polish': 'Liczba elementów do zarządzania.',
			'Romanian': 'Numărul de elemente de gestionat.',
		},
	};

	static readonly index: DiscordLocalisations = {
		name: {
			'English': 'index',
			'Polish': 'indeks',
			'Romanian': 'index',
		},
		description: {
			'English': 'The index of the element.',
			'Polish': 'Indeks elementu.',
			'Romanian': 'Indexul elementului.',
		},
	};

	static readonly user: DiscordLocalisations = {
		name: {
			'English': 'user',
			'Polish': 'użytkownik',
			'Romanian': 'utilizator',
		},
		description: {
			'English': 'The user\'s username, tag, ID or mention.',
			'Polish': 'Nazwa użytkownika, jego tag, ID lub wzmianka.',
			'Romanian':
				'Numele de utilizator, tag-ul, ID-ul sau mențiunea utilizatorului.',
		},
	};

	static readonly show: DiscordLocalisations = {
		name: {
			'English': 'show',
			'Polish': 'wyświetl',
			'Romanian': 'afișare',
		},
		description: {
			'English': 'If set to true, the result will be shown to others.',
			'Polish': 'Jeśli tak, rezultat będzie wyświetlony innym użytkownikom.',
			'Romanian': 'Dacă da, rezultatul va fi afișat altor utilizatori.',
		},
	};
}

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
		},
	});
}

export { Commands, GlobalParameters };
