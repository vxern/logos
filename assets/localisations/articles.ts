import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocalisationsForLanguage } from 'logos/assets/localisations/utils.ts';
import { Language } from 'logos/types.ts';

class Articles {
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
			'English': (language: Language) => `What is your reason for learning ${language}?`,
			'Polish': (language: Language) =>
				`Jaki jest powód dla którego uczysz się ${
					Expressions.polish.cases.genitive.languages[language].toLowerCase()
				}?`,
			'Romanian': (language: Language) =>
				`Care este motivul pentru care înveți ${getLocalisationsForLanguage(language)}?`,
		},
		aim: {
			'English': (_language: Language) => 'How will you benefit from becoming a member?',
			'Polish': (_language: Language) => 'Jaką korzyść przyniesie Tobie członkostwo?',
		},
		whereFound: {
			'English': (language: Language) => `Where did you find out about Learn ${language}?`,
			'Polish': (language: Language) => `Gdzie dowiedziałeś/aś się o Learn ${language}?`,
		},
	};
}

export { Articles };
