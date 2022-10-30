import { code } from '../../src/formatting.ts';
import { Language } from '../../src/types.ts';
import { Expressions } from './expressions.ts';
import { getLocalisations } from './languages.ts';
import { localise } from './types.ts';

class Services {
	static readonly entry = {
		selectProficiency: {
			header: {
				'English': 'Language Proficiency',
				'Polish': 'Biegłość Języczna',
				'Romanian': 'Competența Lingvistică',
			},
			body: {
				'English': (guildLanguage: Language) =>
					`Select the role that most accurately describes your ${
						localise(getLocalisations(guildLanguage), 'English')
					} language proficiency.\n\n` +
					`ℹ️ **You can always change this later using the ${code('/profile roles')} command.**`,
				'Polish': (guildLanguage: Language) =>
					`Wybierz rolę, która najlepiej przedstawia Twoją biegłość w języku ${
						Expressions.polish.cases.instrumental.languages[guildLanguage]
					}.\n\n` +
					`ℹ️ **Pamiętaj, że możesz ją później zmienić używając komendy ${code('/profile roles')}.**`,
				'Romanian': (guildLanguage: Language) =>
					`Alege rolul care îți reprezintă cel mai bine competența în limba ${
						localise(getLocalisations(guildLanguage), 'Romanian')
					}.\n\n` +
					`ℹ️ **Ține minte că o poți schimba mai apoi folosind comanda ${code('/profile roles')}.**`,
			},
		},
		rejected: {
			entryDenied: {
				'English': 'Entry denied',
				'Polish': 'Odmowiono wstępu',
				'Romanian': 'Intrare respinsă',
			},
			reasons: {
				accountTooNew: {
					'English': 'Due to security concerns, accounts that are too new may not enter the server.',
					'Polish': 'Ze względu na bezpieczeństwo, zbyt nowe konta nie mogą dołączyć do serwera.',
					'Romanian': 'Din motive de securitate, conturile care sunt prea noi nu pot intra pe server.',
				},
			},
		},
		verification: {
			answersSubmitted: {
				// Use exclamation if possible.
				header: {
					'English': 'Answers submitted!',
					'Polish': 'Odpowiedzi wysłane!',
					'Romanian': 'Răspunsuri transmise!',
				},
				body: {
					'English': 'Your answers to the verification questions have been submitted.\n\n' +
						'Your request to join the server will be reviewed by a staff member, and you will be notified via DMs when your entry request is accepted.',
					'Polish': 'Wysłano Twoje odpowiedzi na pytania weryfikacyjne.\n\n' +
						'Twoja prośba o dołączenie do serwera będzie przejrzana przez jednego z moderatorów.' +
						'Gdy to się wydarzy, zostaniesz powiadomiony/a poprzez DM.',
					'Romanian': 'Răspunsurile tale la întrebările de verificate au fost transmitate.\n\n' +
						'Cererea ta de a te alătura serverului va fi examinată de către un moderator.' +
						'Când aceasta se va întâmpla, vei fi notificat/ă în DM-uri.',
				},
			},
		},
	};
}

export { Services };
