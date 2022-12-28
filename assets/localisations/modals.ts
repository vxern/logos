import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocaleByLanguage, getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
import { Language } from 'logos/types.ts';

class Modals {
	static readonly article = {
		titles: {
			articleComposer: {
				'English': 'Article Composer',
				'Polish': 'Kompozytor artykułów',
				'Romanian': 'Compozitor de articole',
			},
			articleEditor: {
				'English': 'Article Editor',
				'Polish': 'Edytor artykułów',
				'Romanian': 'Editor de articole',
			},
		},
		fields: {
			title: {
				'English': 'Title of the article',
				'Polish': 'Tytuł artykułu',
				'Romanian': 'Titlul articolului',
			},
			// If possible, use something alike to 'content' rather than 'body'.
			body: {
				'English': 'Body of the article',
				'Polish': 'Treść artykułu',
				'Romanian': 'Conținutul articolului',
			},
			footer: {
				'English': 'Additional information and/or notes',
				'Polish': 'Dodatkowe informacje i/lub notatki',
				'Romanian': 'Informații suplimentare și/sau notițe',
			},
		},
	};

	static readonly verification = {
		title: {
			'English': 'Verification Questions',
			'Polish': 'Pytania weryfikacyjne',
			'Romanian': 'Întrebări de verificare',
		},
		fields: {
			reason: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('English'));

					return `What is your reason for learning ${languageLocalised}?`;
				},
				'Polish': (language: Language) => {
					const languageLocalised = Expressions.polish.cases.genitive.languages[language].toLowerCase();

					return `Jaki jest powód dla którego uczysz się ${languageLocalised}?`;
				},
				'Romanian': (language: Language) => {
					const languageLocalised = localise(
						getLocalisationsForLanguage(language),
						getLocaleByLanguage('Romanian'),
					).toLowerCase();

					return `Care este motivul pentru care înveți ${languageLocalised}?`;
				},
			},
			aim: {
				'English': 'How will you benefit from becoming a member?',
				'Polish': 'Jaką korzyść przyniesie Tobie członkostwo?',
				'Romanian': 'Ce folos îți va aduce apartenența?',
			},
			whereFound: {
				'English': (guildName: string) => `Where did you find out about ${guildName}?`,
				'Polish': (guildName: string) => `Gdzie dowiedziałeś/aś się o ${guildName}?`,
				'Romanian': (guildName: string) => `Unde ai aflat despre ${guildName}?`,
			},
		},
	};

	static readonly report = {
		title: {
			'English': 'User report',
			'Polish': 'Skarga',
			'Romanian': 'Plângere',
		},
		fields: {
			reason: {
				'English': 'What is the reason for the report?',
				'Polish': 'Jaki jest powód skargi?',
				'Romanian': 'Care este cauza plângerii?',
			},
			usersToReport: {
				'English': 'Users to report',
				'Polish': 'Użytkownicy do zgłoszenia',
				'Romanian': 'Utilizatori de raportat',
			},
			linkToMessage: {
				'English': 'Link to the message for context',
				'Polish': 'Link do wiadomości dla kontekstu',
				'Romanian': 'Link către mesajul pentru context',
			},
		},
	};

	static readonly prompts = {
		// The equivalent of 'next', 'continue' or 'onwards' in your language, as seen in message prompts.
		continue: {
			'English': 'Continue',
			'Polish': 'Dalej',
			'Romanian': 'Înapoi',
		},
		cancel: {
			'English': 'Cancel',
			'Polish': 'Anuluj',
			'Romanian': 'Anulează',
		},
		yourProgressWillBeLost: {
			'English': 'Your progress will be lost.',
			'Polish': 'Twój postęp będzie utracony.',
			'Romanian': 'Progresul tău va fi pierdut.',
		},
		// No full stop here.
		// The 'composer' is the form submission prompt where the user is able to compose articles, verification answers, etc.
		yesLeaveTheComposer: {
			'English': 'Yes, I want to leave the composer',
			'Polish': 'Tak, chcę opuścić kompozytor',
			'Romanian': 'Da, vreau să părăsesc compozitorul',
		},
		// No full stop here.
		// The 'composer' is the form submission prompt where the user is able to compose articles, verification answers, etc.
		noTakeMeBackToTheComposer: {
			'English': 'No, take me back to the composer',
			'Polish': 'Nie, zabierz mnie z powrotem do kompozytora',
			'Romanian': 'Nu, ia-mă înapoi la compozitor',
		},
	};
}

export { Modals };
