import { code } from '../../src/formatting.ts';
import { Language } from '../../src/types.ts';
import { Expressions } from './expressions.ts';
import { localisationsByLanguage } from './languages.ts';

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
					`Select the role that most accurately describes your ${guildLanguage} language proficiency.\n\n` +
					`ℹ️ **You can always change this later using the ${
						code('/profile roles')
					} command.** ℹ️`,
				'Polish': (guildLanguage: Language) =>
					`Wybierz rolę, która przedstawia najlepiej Twoją biegłość w języku ${
						Expressions.polish.cases.instrumental.languages[guildLanguage]
					}.\n\n` +
					`ℹ️ **Pamiętaj, że możesz ją później zmienić używając komendy ${
						code('/profile roles')
					}.** ℹ️`,
				'Romanian': (guildLanguage: Language) =>
					`Alege rolul care îți reprezintă competența cel mai bine în limba ${
						localisationsByLanguage[guildLanguage]
					}.\n\n` +
					`ℹ️ **Ține minte că o poți schimba mai apoi folosind comanda ${
						code('/profile roles')
					}.** ℹ️`,
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
					'English':
						'Due to security concerns, accounts that are too new may not enter the server.',
					'Polish':
						'Ze względu na bezpieczeństwo, zbyt nowe konta nie mogą dołączyć do serwera.',
					'Romanian':
						'Din motive de securitate, conturile care sunt prea noi nu pot intra pe server.',
				},
			},
		},
	};
}

export { Services };
