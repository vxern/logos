import { list } from 'logos/formatting.ts';

class Information {
	static readonly rules = {
		lastUpdated: {
			'English': '*Last updated: 8th September 2022*',
			'Polish': '*Ostatnio aktualizowane: 8 września 2022*',
			'Romanian': '*Actualizat ultima dată: 8 septembrie 2022*',
		},
		tldr: {
			'English': 'TL;DR',
			'Polish': 'Strzeszczenie',
			'Romanian': 'Pe scurt',
		},
		rule: {
			'English': 'Rule',
			'Polish': 'Reguła',
			'Romanian': 'Regulă',
		},
		rules: {
			behaviour: {
				title: {
					'English': 'Behaviour',
					'Polish': 'Zachowanie',
					'Romanian': 'Comportament',
				},
				summary: {
					'English': 'Try to be nice.',
					'Polish': 'Staraj się być miły/a.',
					'Romanian': 'Încearcă să fii drăguț/ă.',
				},
				content: {
					'English': 'It is expected of members to treat each other with respect, consideration and understanding. ' +
						'Malicious behaviour in the form of verbal abuse, discrimination, harassment and other forms of hurtful or toxic behaviour will not be tolerated.',
					'Polish': 'Od członków oczekuje się traktowania siebie nawzajem z szacunkiem, rozwagą, oraz zrozumieniem. ' +
						'Złośliwe zachowanie w postaci obelg słownych, dyskryminacji, nękania lub innych wcieleń krzywdzących lub toksycznych zachowań nie będzie tolerowane.',
					'Romanian': 'Se așteaptă de la membri să se trateze reciproc cu respect, considerație și cu înțelegere. ' +
						'Comportamentul rău-intenționat sub formă de abuz verbal, discriminare, hărțuire și alte forme de comportament jignitor sau toxic nu va fi tolerat.',
				},
			},
			quality: {
				title: {
					'English': 'Quality',
					'Polish': 'Jakość',
					'Romanian': 'Calitate',
				},
				summary: {
					'English': 'Do not be obnoxious.',
					'Polish': 'Nie bądź wstrętny/a.',
					'Romanian': 'Nu fi insuportabil/ă.',
				},
				content: {
					'English': 'It is expected of contributions made to the server to be of decent quality. ' +
						'Trolling, spamming, flooding, shitposting (outside of the channel for memes) and other forms of annoying behaviour are sorely discouraged.',
					'Polish': 'Oczekuje się, że wkłady wnoszone na serwer będą przyzwoitej jakości. ' +
						'Zniechęcamy do trollingu, spamowania, floodowania, shitpostingu (poza kanałem dla memów), oraz innych form irytującego zachowania.',
					'Romanian': 'Se așteaptă ca contribuțiile făcute pe server să fie de o calitate decentă. ' +
						'Trolling-ul, spamming-ul, flooding-ul, shitposting-ul (în afara canalului pentru meme-uri) și alte forme de comportament enervant sunt puternic descurajate.',
				},
			},
			relevance: {
				title: {
					'English': 'Relevance',
					'Polish': 'Odpowiedność',
					'Romanian': 'Relevanță',
				},
				summary: {
					'English': 'Post relevant content.',
					'Polish': 'Zamieszczaj treści w ich odpowiednich miejscach.',
					'Romanian': 'Postează un conținut relevant.',
				},
				content: {
					'English':
						'It is expected of contributions made to the server to be placed in their relevant channel and category. ' +
						'Contributions made in inappropriate channels for their subject will be asked to be moved to their relevant channel.',
					'Polish':
						'Oczekuje się, że wkłady wnoszone na serwer będą umieszczane w odpowiednim kanale oraz kategorii. ' +
						'Wkłady w kanałach nieodpowiednich dla ich tematyki będą proszone o przeniesienie ich na odpowiedni kanał.',
					'Romanian':
						'Se așteaptă ca contribuțiile făcute pe server să fie plasate în canalul și categoria sa corespunzătoare. ' +
						'Contribuțiile făcute în canale nepotrivite pentru subiectul său vor fi solicitate să fie mutate în canalul său potrivitor.',
				},
			},
			suitability: {
				title: {
					'English': 'Suitability',
					'Polish': 'Stosowność',
					'Romanian': 'Adecvare',
				},
				summary: {
					'English': 'Post content appropriate for younger members.',
					'Polish': 'Zamieszczaj treści stosowne dla młodszych członków.',
					'Romanian': 'Postează un conținut adecvat.',
				},
				content: {
					'English': 'It is expected of contributions made to the server to be appropriate for viewing by minors. ' +
						'Age-restricted (NSFW) and NSFL content is strictly prohibited. If you wouldn\'t show it to a minor, you shouldn\'t post it.',
					'Polish': 'Oczekuje się, że wkłady wnoszone na serwer będą stosowne dla oglądania przez osoby młodsze. ' +
						'Wszelkie treści z ograniczeniem wiekowym (NSFW) lub o charakterze drastycznym (NSFL) są kompletnie wzbronione. ' +
						'Jeśli nie pokazał(a)byś treści osobie młodszej, nie wysyłaj jej na serwer.',
					'Romanian': 'Se așteaptă că contribuțiile făcute pe server să fie potrivite pentru minori. ' +
						'Tot conținutul cu o restricție de vârstă (NSFW) sau de natură atroce (NSFL) este complet interzis. Dacă nu ai arăta conținutul unui adolescent, să nu îl trimiți pe server.',
				},
			},
			exclusivity: {
				title: {
					'English': 'Exclusivity',
					'Polish': 'Ekskluzywność',
					'Romanian': 'Exclusivitate',
				},
				summary: {
					'English': 'Do not advertise.',
					'Polish': 'Nie reklamuj się.',
					'Romanian': 'Nu face reclamă.',
				},
				content: {
					'English':
						'It is expected of members to not use this space for advertising, and active attempts at it (including unsolicited DMs) are prohibited.',
					'Polish':
						'Oczekuje się, że członkowie nie będą używać tej przestrzeni do reklamacji, w tym samego/samej siebie. ' +
						'Zabrania się aktywnych prób reklamacji (w tym niechcianych wiadomości prywatnych).',
					'Romanian':
						'Se așteaptă de la membrii serverului ca aceștia să nu se folosească de acest spațiu pentru a-și face reclamă. ' +
						'Încercările active de a face publicitate (inclusiv mesajele private nesolicitate) sunt interzise.',
				},
			},
			adherence: {
				title: {
					'English': 'Adherence',
					'Polish': 'Przestrzeganie',
					'Romanian': 'Aderență',
				},
				summary: {
					'English': 'Respect the rules.',
					'Polish': 'Szanuj zasady.',
					'Romanian': 'Respectă regulamentul.',
				},
				content: {
					'English':
						'For members who show no regard for the server rules, and are not interested in making useful contributions, a permanent ban may be issued.',
					'Polish':
						'Członkowie, którzy nie liczą się z regułami serwera, i ci, którzy nie są zainteresowani wnoszeniem użytecznego wkładu na serwer, mogą dostać permabana.',
					'Romanian':
						'Membrii care nu arată nicio considerație față de regulament, și cei care nu sunt deloc interesați în a face contribuții constructive pe server pot primi un ban permanent.',
				},
			},
		},
		// Do not localise; this is a public feedback message.
		moderationPolicy: {
			header: {
				'English': 'Moderation policy',
			},
			body: {
				'English': (moderatorRoleMention: string) =>
					list(
						[
							`The server abides by a 3-warn moderation policy, enforced by the server's ${moderatorRoleMention}s.`,
							'The above rules apply to the entirety of the server, and a breach thereof will cause a warning to be issued. Warnings expire after a period of two months.',
							'Depending on the circumstances, a timeout may be issued to the member for the duration of 5, 15, or 60 minutes respectively.',
							'If a member has already received three warnings, the fourth warning will warrant a kick from the server. If they rejoin, and are warned again, they will be banned permanently.',
						],
					),
			},
		},
	};

	// Do not localise; this is a public feedback message.
	static readonly invite = {
		'English': 'Permanent invite link',
	};
}

export { Information };
