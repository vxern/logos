import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocaleForLanguage, getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
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
				`Care este motivul pentru care înveți ${
					localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Romanian'))!.toLowerCase()
				}?`,
		},
		aim: {
			'English': (_language: Language) => 'How will you benefit from becoming a member?',
			'Polish': (_language: Language) => 'Jaką korzyść przyniesie Tobie członkostwo?',
			'Romanian': (_language: Language) => 'Ce folos ți va aduce apartenența?',
		},
		whereFound: {
			'English': (language: Language) => `Where did you find out about Learn ${language}?`,
			'Polish': (language: Language) => `Gdzie dowiedziałeś/aś się o Learn ${language}?`,
			'Romanian': (language: Language) => `Unde ai aflat despre Learn ${language}?`,
		},
	};
}

export { Articles };
