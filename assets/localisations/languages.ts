import { Locales } from 'discordeno';
import { inferLanguages } from 'logos/assets/localisations/utils.ts';
import { Language } from 'logos/types.ts';

// Do not change key names.
const localisationsByLanguage = inferLanguages({
	'Armenian': {
		'English': 'Armenian',
		'Polish': 'Ormiański',
		'Romanian': 'Armeană',
	},
	'Belarusian': {
		'English': 'Belarusian',
		'Polish': 'Białoruski',
		'Romanian': 'Belarusă',
	},
	'Bulgarian': {
		'English': 'Bulgarian',
		'Polish': 'Bułgarski',
		'Romanian': 'Bulgară',
	},
	'Chinese': {
		'English': 'Chinese',
		'Polish': 'Chiński',
		'Romanian': 'Chineză',
	},
	'Chinese (simplified)': {
		'English': 'Chinese (Simplified)',
		'Polish': 'Chiński (Uproszczony)',
		'Romanian': 'Chineză (Simplificată)',
	},
	'Czech': {
		'English': 'Czech',
		'Polish': 'Czeski',
		'Romanian': 'Cehă',
	},
	'Danish': {
		'English': 'Danish',
		'Polish': 'Duński',
		'Romanian': 'Daneză',
	},
	'Dutch': {
		'English': 'Dutch',
		'Polish': 'Niderlandzki',
		'Romanian': 'Neerlandeză',
	},
	'English': {
		'English': 'English',
		'Polish': 'Angielski',
		'Romanian': 'Engleză',
	},
	'English (American)': {
		'English': 'English (American)',
		'Polish': 'Angielski (Amerykański)',
		'Romanian': 'Engleză (Americană)',
	},
	'English (British)': {
		'English': 'English (British)',
		'Polish': 'Angielski (Brytyjski)',
		'Romanian': 'Engleză (Britanică)',
	},
	'Estonian': {
		'English': 'Estonian',
		'Polish': 'Estoński',
		'Romanian': 'Estonă',
	},
	'Finnish': {
		'English': 'Finnish',
		'Polish': 'Fiński',
		'Romanian': 'Finlandeză',
	},
	'French': {
		'English': 'French',
		'Polish': 'Francuski',
		'Romanian': 'Franceză',
	},
	'German': {
		'English': 'German',
		'Polish': 'Niemiecki',
		'Romanian': 'Germană',
	},
	'Greek': { 'English': 'Greek', 'Polish': 'Grecki', 'Romanian': 'Greacă' },
	'Hungarian': {
		'English': 'Hungarian',
		'Polish': 'Węgierski',
		'Romanian': 'Maghiară',
	},
	'Indonesian': {
		'English': 'Indonesian',
		'Polish': 'Indonezyjski',
		'Romanian': 'Indoneziană',
	},
	'Italian': {
		'English': 'Italian',
		'Polish': 'Włoski',
		'Romanian': 'Italiană',
	},
	'Japanese': {
		'English': 'Japanese',
		'Polish': 'Japoński',
		'Romanian': 'Japoneză',
	},
	'Latvian': {
		'English': 'Latvian',
		'Polish': 'Łotewski',
		'Romanian': 'Letonă',
	},
	'Lithuanian': {
		'English': 'Lithuanian',
		'Polish': 'Litewski',
		'Romanian': 'Lituaniană',
	},
	'Polish': { 'English': 'Polish', 'Polish': 'Polski', 'Romanian': 'Poloneză' },
	'Portuguese': {
		'English': 'Portuguese',
		'Polish': 'Portugalski',
		'Romanian': 'Portugheză',
	},
	'Portuguese (Brazilian)': {
		'English': 'Portuguese (Brazilian)',
		'Polish': 'Portugalski (Brazylijski)',
		'Romanian': 'Portugheză (Braziliană)',
	},
	'Portuguese (European)': {
		'English': 'Portuguese (European)',
		'Polish': 'Portugalski (Europejski)',
		'Romanian': 'Portugheză (Europeană)',
	},
	'Romanian': {
		'English': 'Romanian',
		'Polish': 'Rumuński',
		'Romanian': 'Română',
	},
	'Russian': { 'English': 'Russian', 'Polish': 'Rosyjski', 'Romanian': 'Rusă' },
	'Slovak': {
		'English': 'Slovak',
		'Polish': 'Słowacki',
		'Romanian': 'Slovacă',
	},
	'Slovenian': {
		'English': 'Slovenian',
		'Polish': 'Słoweński',
		'Romanian': 'Slovenă',
	},
	'Spanish': {
		'English': 'Spanish',
		'Polish': 'Hiszpański',
		'Romanian': 'Spaniolă',
	},
	'Swedish': {
		'English': 'Swedish',
		'Polish': 'Szwedzki',
		'Romanian': 'Suedeză',
	},
	'Turkish': { 'English': 'Turkish', 'Polish': 'Turecki', 'Romanian': 'Turcă' },
	'Ukrainian': {
		'English': 'Ukrainian',
		'Polish': 'Ukraiński',
		'Romanian': 'Ucraineană',
	},
});

const localeByLanguage: Partial<Record<Language, `${Locales}`>> = {
	'English': 'en-GB',
	'Polish': 'pl',
	'Romanian': 'ro',
};

export { localeByLanguage, localisationsByLanguage };
