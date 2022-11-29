import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
import { code } from 'logos/formatting.ts';
import { Language } from 'logos/types.ts';

class Services {
	static readonly entry = {
		selectProficiency: {
			header: {
				'English': 'Language Proficiency',
				'Polish': 'Biegłość Języczna',
				'Romanian': 'Competență Lingvistică',
			},
			body: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), 'English');

					return `Select the role that most accurately describes your ${languageLocalised} language proficiency.\n\n` +
						`ℹ️ **You can always change this later using the ${code('/profile roles')} command.**`;
				},
				'Polish': (language: Language) => {
					const languageLocalised = Expressions.polish.cases.instrumental.languages[language];

					return `Wybierz rolę, która najlepiej przedstawia Twoją biegłość w języku ${languageLocalised}.\n\n` +
						`ℹ️ **Pamiętaj, że możesz ją później zmienić używając komendy ${code('/profile roles')}.**`;
				},
				'Romanian': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), 'Romanian');

					return `Alege rolul care îți reprezintă cel mai bine competența în limba ${languageLocalised}.\n\n` +
						`ℹ️ **Ține minte că îl poți schimba mai apoi folosind comanda ${code('/profile roles')}.**`;
				},
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
					'Polish': 'Twoje odpowiedzi na pytania weryfikacyjne zostały wysłane.\n\n' +
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
