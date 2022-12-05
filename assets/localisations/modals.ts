import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocaleByLanguage, getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
import { Language } from 'logos/types.ts';

class Modals {
	static readonly article = {
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
	};

	static readonly verification = {
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
			'Romanian': 'Ce folos ți va aduce apartenența?',
		},
		whereFound: {
			'English': (guildName: string) => `Where did you find out about ${guildName}?`,
			'Polish': (guildName: string) => `Gdzie dowiedziałeś/aś się o ${guildName}?`,
			'Romanian': (guildName: string) => `Unde ai aflat despre ${guildName}?`,
		},
	};
}

export { Modals };
