import { Language } from '../../src/types.ts';
import { Expression } from './types.ts';
import { Localisations } from './types.ts';

class Articles {
	static readonly article: Record<string, Localisations<string>> = {
		title: {
			'English': 'Title of the article',
			'Polish': 'Tytuł artykułu',
		},
		body: {
			'English': 'Body of the article',
			'Polish': 'Treść artykułu',
		},
		footer: {
			'English': 'Additional information and/or notes',
			'Polish': 'Dodatkowe informacje i/lub notatki',
		},
	};

	static readonly verification: Record<
		string,
		Localisations<Expression<Language>>
	> = {
		reason: {
			'English': (language) => `What is your reason for learning ${language}?`,
			'Polish': (language) =>
				`Jaki jest powód dla którego uczysz się ${language}?`,
		},
		aim: {
			'English': (_language) => 'How will you benefit from becoming a member?',
			'Polish': (_language) => 'Jaką korzyść przyniesie Tobie członkostwo?',
		},
		whereFound: {
			'English': (language) =>
				`Where did you find out about Learn ${language}?`,
			'Polish': (language) => `Gdzie dowiedziałeś/aś się o Learn ${language}?`,
		},
	};
}

export { Articles };
