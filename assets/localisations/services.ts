import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
import { code } from 'logos/formatting.ts';
import { getLocaleForLanguage, Language } from 'logos/types.ts';

class Services {
	static readonly notices = {
		lastUpdate: {
			'English': (timestamp: string) => `Last updated: ${timestamp}`,
			'Hungarian': (timestamp: string) => `Utolsó frissítés dátuma: ${timestamp}`,
			'Polish': (timestamp: string) => `Ostatnia aktualizacja: ${timestamp}`,
			'Romanian': (timestamp: string) => `Ultima actualizare: ${timestamp}`,
		},
		notices: {
			welcome: {
				header: {
					'English': (guildName: string) => `Welcome to **${guildName}**`,
				},
				body: {
					'English': (rulesChannelMention: string) =>
						`To enter the server and become its official member, read the information in the ${rulesChannelMention} channel to get yourself familiarised with the server guidelines, and then press the button below.`,
				},
			},
			roles: {
				roles: {
					header: {
						'English': 'How to pick roles',
					},
					body: {
						'English': `You can select roles using the ${code('/profile roles')} command. ` +
							'This command can be run anywhere on the server, and will open a browseable selection menu where you can pick the roles you want.\n\n' +
							'Alternatively, you can press the button below to open the menu right within this channel.',
					},
				},
				clickHereToSelectRoles: {
					'English': 'Click here to select roles',
				},
			},
			information: {
				rules: {
					tldr: {
						'English': 'TL;DR',
						'Hungarian': 'Röviden',
						'Polish': 'Strzeszczenie',
						'Romanian': 'Pe scurt',
					},
					rule: {
						'English': 'Rule',
						'Hungarian': 'Szabály',
						'Polish': 'Reguła',
						'Romanian': 'Regulă',
					},
					rules: {
						behaviour: {
							title: {
								'English': 'Behaviour',
								'Hungarian': 'Viselkedés',
								'Polish': 'Zachowanie',
								'Romanian': 'Comportament',
							},
							summary: {
								'English': 'Try to be nice.',
								'Hungarian': 'Igyekezz kedves lenni.',
								'Polish': 'Staraj się być miły/a.',
								'Romanian': 'Încearcă să fii drăguț/ă.',
							},
							content: {
								'English':
									'It is expected of members to treat each other with respect, consideration and understanding. ' +
									'Malicious behaviour in the form of verbal abuse, discrimination, harassment and other forms of hurtful or toxic behaviour will not be tolerated.',
								'Hungarian': 'A tagoknak tisztelettel, megértéssel és belátással kell viseltetniük egymás iránt. ' +
									'Nem elfogadott a verbális bántalmazás, kirekesztés, zaklatás, illetve a rosszindulatú, bántó vagy mérgező viselkedés semmilyen más formája sem.',
								'Polish':
									'Od członków oczekuje się traktowania siebie nawzajem z szacunkiem, rozwagą, oraz zrozumieniem. ' +
									'Złośliwe zachowanie w postaci obelg słownych, dyskryminacji, nękania lub innych wcieleń krzywdzących lub toksycznych zachowań nie będzie tolerowane.',
								'Romanian':
									'Se așteaptă de la membri să se trateze reciproc cu respect, considerație și cu înțelegere. ' +
									'Comportamentul rău-intenționat sub formă de abuz verbal, discriminare, hărțuire și alte forme de comportament jignitor sau toxic nu va fi tolerat.',
							},
						},
						quality: {
							title: {
								'English': 'Quality',
								'Hungarian': 'Minőség',
								'Polish': 'Jakość',
								'Romanian': 'Calitate',
							},
							summary: {
								'English': 'Do not be obnoxious.',
								'Hungarian': 'Ne legyél kiállhatatlan.',
								'Polish': 'Nie bądź wstrętny/a.',
								'Romanian': 'Nu fi insuportabil/ă.',
							},
							content: {
								'English': 'It is expected of contributions made to the server to be of decent quality. ' +
									'Trolling, spamming, flooding, shitposting (outside of the channel for memes) and other forms of annoying behaviour are sorely discouraged.',
								'Hungarian':
									'Mindennemű hozzájárulásnak, aktivitásnak igényesnek (vállalható színvonalúnak) kell lennie. ' +
									'Elítélendő a trollkodás, spammelés, floodolás, shitpostolás (a mémeknek szánt csatornán kívül), és az irritáló viselkedés egyéb formái.',
								'Polish': 'Oczekuje się, że wkłady wnoszone na serwer będą przyzwoitej jakości. ' +
									'Zniechęcamy do trollingu, spamowania, floodowania, shitpostingu (poza kanałem dla memów), oraz innych form irytującego zachowania.',
								'Romanian': 'Se așteaptă ca contribuțiile făcute pe server să fie de o calitate decentă. ' +
									'Trolling-ul, spamming-ul, flooding-ul, shitposting-ul (în afara canalului pentru meme-uri) și alte forme de comportament enervant sunt puternic descurajate.',
							},
						},
						relevance: {
							title: {
								'English': 'Relevance',
								'Hungarian': 'Relevancia',
								'Polish': 'Odpowiedność',
								'Romanian': 'Relevanță',
							},
							summary: {
								'English': 'Post relevant content.',
								'Hungarian': 'Posztolj releváns tartalmat.',
								'Polish': 'Zamieszczaj treści w ich odpowiednich miejscach.',
								'Romanian': 'Postează un conținut relevant.',
							},
							content: {
								'English':
									'It is expected of contributions made to the server to be placed in their relevant channel and category. ' +
									'Contributions made in inappropriate channels for their subject will be asked to be moved to their relevant channel.',
								'Hungarian':
									'A hozzájárulásokat a maguk helyén - megfelelő csatornában és kategóriában - kell megtenni. ' +
									'Ha bizonyos tartalmat a nem megfelelő csatornába küldesz, meg fogunk kérni, hogy helyezd át a megfelelő helyre.',
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
								'Hungarian': 'Illőség',
								'Polish': 'Stosowność',
								'Romanian': 'Adecvare',
							},
							summary: {
								'English': 'Post content appropriate for younger members.',
								'Hungarian': 'Fiatalabb tagoknak is elfogadható tartalmat posztolj.',
								'Polish': 'Zamieszczaj treści stosowne dla młodszych członków.',
								'Romanian': 'Postează un conținut adecvat.',
							},
							content: {
								'English':
									'It is expected of contributions made to the server to be appropriate for viewing by minors. ' +
									'Age-restricted (NSFW) and NSFL content is strictly prohibited. If you wouldn\'t show it to a minor, you shouldn\'t post it.',
								'Hungarian': 'A hozzájárulásoknak kiskorúak számára is illendőnek kell lenniük. ' +
									'Szigorúan tilos korhatáros (NSFW) és felkavaró (NSFL) tartalmak megosztása. Ha nem mutatnád meg egy kiskorúnak, akkor ne is posztold.',
								'Polish':
									'Oczekuje się, że wkłady wnoszone na serwer będą stosowne dla oglądania przez osoby młodsze. ' +
									'Wszelkie treści z ograniczeniem wiekowym (NSFW) lub o charakterze drastycznym (NSFL) są kompletnie wzbronione. ' +
									'Jeśli nie pokazał(a)byś treści osobie młodszej, nie wysyłaj jej na serwer.',
								'Romanian': 'Se așteaptă că contribuțiile făcute pe server să fie potrivite pentru minori. ' +
									'Tot conținutul cu o restricție de vârstă (NSFW) sau de natură atroce (NSFL) este complet interzis. Dacă nu ai arăta conținutul unui adolescent, să nu îl trimiți pe server.',
							},
						},
						exclusivity: {
							title: {
								'English': 'Exclusivity',
								'Hungarian': 'Kizárólagosság',
								'Polish': 'Ekskluzywność',
								'Romanian': 'Exclusivitate',
							},
							summary: {
								'English': 'Do not advertise.',
								'Hungarian': 'Ne hirdess.',
								'Polish': 'Nie reklamuj się.',
								'Romanian': 'Nu face reclamă.',
							},
							content: {
								'English':
									'It is expected of members to not use this space for advertising, and active attempts at it (including unsolicited DMs) are prohibited.',
								'Hungarian': 'Minden tagtól elvárt, hogy ne használják ezt a teret hirdetésre. ' +
									'Tilos tevőlegesen próbálkozni ezzel - ideértve a kéretlen privát üzeneteket is.',
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
								'Hungarian': 'Szabálykövetés',
								'Polish': 'Przestrzeganie',
								'Romanian': 'Aderență',
							},
							summary: {
								'English': 'Respect the rules.',
								'Hungarian': 'Tartsd tiszteletben a szabályokat.',
								'Polish': 'Szanuj zasady.',
								'Romanian': 'Respectă regulamentul.',
							},
							content: {
								'English':
									'For members who show no regard for the server rules, and are not interested in making useful contributions, a permanent ban may be issued.',
								'Hungarian':
									'Végleges kitiltásban részesülhetnek azok a tagok, akik semmibe veszik a szerver szabályait, és semmilyen módon nem szándékoznak hasznosan hozzájárulni a szerverhez.',
								'Polish':
									'Członkowie, którzy nie liczą się z regułami serwera, i ci, którzy nie są zainteresowani wnoszeniem użytecznego wkładu na serwer, mogą dostać permabana.',
								'Romanian':
									'Membrii care nu arată nicio considerație față de regulament, și cei care nu sunt deloc interesați în a face contribuții constructive pe server pot primi un ban permanent.',
							},
						},
					},
					moderationPolicy: {
						header: {
							'English': 'Moderation Policy',
							// TODO: Add Hungarian translation.
							'Polish': 'Polityka Moderowania',
							'Romanian': 'Politică de Moderare',
						},
						body: {
							points: {
								one: {
									'English': (moderatorRoleMention: string) =>
										`The server abides by a 3-warn moderation policy, enforced by the server's ${moderatorRoleMention}s.`,
									// TODO: Add Hungarian translation.
									'Polish': (moderatorRoleMention: string) =>
										`Na serwerze obowiązuje polityka moderacji na bazie trzech ostrzeżeń, zgodnie z którą działają moderatorzy serwera (osoby z rolą ${moderatorRoleMention}).`,
									'Romanian': (moderatorRoleMention: string) =>
										`Serverul respectă o politică de moderație cu trei avertismente. Moderatorii (persoanele cu rolul ${moderatorRoleMention}) aplică regulile în conformitate cu această politică de moderare.`,
								},
								two: {
									'English':
										'The above rules apply to the entirety of the server, and a breach thereof will result in a warning being issued. Warnings expire after a period of __two months__.',
									// TODO: Add Hungarian translation.
									'Polish':
										'Reguły serwera obowiązują dla każdego użytkownika, a poważne ich naruszenie zaskutkuje ostrzeżeniem. Ostrzeżenia wygasają po upływie __dwóch miesięcy__.',
									'Romanian':
										'Regulile serverului se aplică tuturor membri, iar o încălcare gravă a acestora va rezulta în acordarea unui avertisment. Avertismentele expiră după o __perioadă de două luni__.',
								},
								three: {
									'English':
										'If a user has already received three warnings, the fourth warning will cause the user to be timed out.',
									// TODO: Add Hungarian translation.
									'Polish':
										'W przypadku gdy użytkownik ma już trzy ostrzeżenia, przy otrzymaniu czwartego ostrzeżenia, użytkownik dostanie timeout.',
									'Romanian':
										'În cazul în care un anumit utilizator are deja trei avertismente, împreună cu primirea celui de-al patrulea avertisment, utilizatorul va primi un timeout.',
								},
								four: {
									'English':
										'Consequently, the server staff will be informed of the limit being passed and, subsequently, will review the circumstances and determine an appropriate course of action.',
									// TODO: Add Hungarian translation.
									'Polish':
										'Następnie, moderatorzy serwera zostaną poinformowani o tym, iż ów limit ostrzeżeń przekroczono, po czym moderatorzy przejrzą oraz zbadają sytuację, i zdecydują, co dalej.',
									'Romanian':
										'În consecință, personalul serverului va fi informat cu privire la depășirea limitei și, ulterior, va analiza circumstanțele depășirii și va stabili un curs de acțiune adecvat.',
								},
								five: {
									'English':
										'In case of it having been found that a user had knowingly and constantly been breaking the server rules and/or ignoring suggestions of the staff, the user will be permanently banned from the server.',
									// TODO: Add Hungarian translation.
									'Polish':
										'Jeśli zostanie stwierdzone, że użytkownik ten świadomie i stale lekceważył reguły serwera i/lub ignorował sugestie moderatorów, użytkownik zostanie trwale wykluczony z serwera.',
									'Romanian':
										'Dacă se va determina că acest utilizator -- în mod conștient și persistent -- a desconsiderat regulile serverului și/sau a ignorat sugestiile moderatorilor, utilizatorul va fi exlus permanent din server (banned).',
								},
							},
						},
					},
				},
				// Do not localise; this is a public feedback message.
				invite: {
					'English': 'Permanent invite link',
				},
			},
		},
	};

	static readonly entry = {
		// No full stop here.
		acceptedRules: {
			'English': 'I have read the rules, and agree to abide by them',
		},
		selectProficiency: {
			header: {
				'English': 'Language Proficiency',
				'Hungarian': 'Nyelvi Jártasság',
				'Polish': 'Biegłość Języczna',
				'Romanian': 'Competență Lingvistică',
			},
			body: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('English'));

					return `Select the role that most accurately describes your ${languageLocalised} language proficiency.\n\n` +
						`ℹ️ **You can always change this later using the ${code('/profile roles')} command.**`;
				},
				'Hungarian': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), 'Hungarian');

					return `Válaszd ki azt a rangot, ami a legjobban leírja a jártasságodat a ${languageLocalised} nyelvben.\n\n` +
						`ℹ️ **A választásodat bármikor megváltoztathatod a ${code('/profile roles')} parancs használatával.**`;
				},
				'Polish': (language: Language) => {
					const languageLocalised = Expressions.polish.cases.genitive.languages[language].toLowerCase();

					return `Wybierz rangę, która najlepiej przedstawia Twoją znajomość języka ${languageLocalised}.\n\n` +
						`ℹ️ **Pamiętaj, że możesz ją później zmienić używając komendy ${code('/profile roles')}.**`;
				},
				'Romanian': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleForLanguage('Romanian'))
						.toLowerCase();

					return `Alege rolul care îți reprezintă cel mai bine competența în limba ${languageLocalised}.\n\n` +
						`ℹ️ **Ține minte că îl poți schimba mai apoi folosind comanda ${code('/profile roles')}.**`;
				},
			},
		},
		verifyingAccount: {
			'English': 'Your account is being verified...',
			'Polish': 'Trwa weryfikowanie twojego konta...',
			'Romanian': 'Se verifică contul tău...',
		},
		failedToVerifyAccount: {
			'English': 'We couldn\'t verify your account.',
			'Polish': 'Nie udało się zweryfikować twojego konta.',
			'Romanian': 'Nu s-a putut verifica contul tău.',
		},
		accountTooNew: {
			'English': 'Due to security concerns, accounts that are too new may not enter the server.',
			'Hungarian': 'Biztonsági megfontolások miatt túl új fiókok nem léphetnek be a szerverre.',
			'Polish': 'Ze względu na bezpieczeństwo, zbyt nowe konta nie mogą dołączyć do serwera.',
			'Romanian': 'Din motive de securitate, conturile care sunt prea noi nu pot intra pe server.',
		},
		needsVerification: {
			'English': (guildName: string) =>
				`Before you can enter ${guildName}, you must first verify yourself by answering a set of verification questions.\n\n` +
				'Please answer them honestly as rejections are permanent, and you won\'t be able to submit a new set of answers.',
			'Polish': (_: string) =>
				`Zanim wstąpisz na serwer, wpierw musisz się zweryfikować odpowiadając na kilka pytań weryfikacyjnych.\n\n` +
				'Prosimy odpowiadać szczerze, gdyż odrzucenie prośby o dołączenie jest na stałe.',
			'Romanian': (guildName: string) =>
				`Înainte de a intra în ${guildName}, trebuie mai întâi să te verifici răspunzând la câteva întrebări de verificare.\n\n` +
				'Te rugăm să răspunzi cu sinceritate, deoarece respingerile sunt permanente.',
		},
		iUnderstand: {
			'English': 'I understand, and wish to proceed',
			'Polish': 'Rozumiem, chcę odpowiedzieć na pytania',
			'Romanian': 'Înțeleg, și vreau să continui',
		},
		entryRequestRejectedPreviously: {
			'English': 'Your entry request has been rejected previously; You cannot join the server.',
			'Polish': 'Twoją prośbę o dołączenie poprzednio odrzucono; Nie możesz dołączyć do serwera.',
			'Romanian': 'Cererea ta de a se alătura serverului a fost respinsă anterior; Nu poți intra pe server.',
		},
		alreadySubmittedAnswers: {
			'English': 'You have already submitted answers to the verification questions. ' +
				'You will be notified once your request to join is reviewed by the moderators.',
			'Polish': 'Już odpowiedziałeś na pytania weryfikacyjne. ' +
				'Gdy moderatorzy zweryfikują odpowiedzi, zostaniesz poinformowany/a o ich decyzji.',
			'Romanian': 'Ai răspuns deja la întrebările de verificare. ' +
				'Când moderatorii verifică răspunsurile, vei fi informat/ă despre decizia sa.',
		},
		answersSubmitted: {
			// Use exclamation if possible.
			header: {
				'English': 'Answers submitted!',
				'Hungarian': 'Válaszok beküldve!',
				'Polish': 'Odpowiedzi wysłane!',
				'Romanian': 'Răspunsuri transmise!',
			},
			body: {
				'English': 'Your answers to the verification questions have been submitted.\n\n' +
					'Your request to join the server will be reviewed by the server staff, and you will be notified via DMs when your entry request is accepted.',
				// TODO: Staff member -> Server staff
				'Hungarian': 'A hitelesítő kérdésekre adott válaszaid továbbítva lettek.\n\n' +
					'A csatlakozási kérelmedet egy stábtag fogja elbírálni, az eredményről DM-ben kapsz értesítést.',
				'Polish': 'Twoje odpowiedzi na pytania weryfikacyjne zostały wysłane.\n\n' +
					'Twoja prośba o dołączenie do serwera będzie przejrzana przez moderatorów serwera. ' +
					'Gdy to się wydarzy, zostaniesz powiadomiony/a poprzez DM.',
				'Romanian': 'Răspunsurile tale la întrebările de verificate au fost transmise.\n\n' +
					'Cererea ta de a te alătura serverului va fi examinată de către moderatorii serverului. ' +
					'Când aceasta se va întâmpla, vei fi notificat/ă în DM-uri.',
			},
		},
		failedToSubmitAnswers: {
			'English': 'Failed to submit answers to the verification questions.',
			// TODO: Add Hungarian localisations.
			'Polish': 'Nie udało się przesłać odpowiedzi na pytania weryfikacyjne.',
			'Romanian': 'Nu am reușit să transmitem răspunsurile tale la întrebări.',
		},
		acceptedDirect: {
			'English': (guildName: string) =>
				`Your request to join ${guildName} has been accepted.\n\n` +
				'Thank you for the wait.',
			// TODO: Add Hungarian localisations.
			'Polish': (guildName: string) =>
				`Zaakceptowano twoją prośbę o dołączenie do ${guildName}.\n\n` +
				'Dziękujemy Ci, że poczekałeś/aś.',
			'Romanian': (guildName: string) =>
				`Cererea ta de a te alătura serverului ${guildName} a fost acceptată.` +
				'Îți mulțumim că ai așteptat.',
		},
		rejectedDirect: {
			'English': (guildName: string) =>
				`Your request to join ${guildName} has been rejected. This decision was made by a majority of the server's moderation team.\n\n` +
				'You will not be able to return to the server.',
			// TODO: Add Hungarian localisations.
			'Polish': (guildName: string) =>
				`Odrzucono twoją prośbę o dołączenie do ${guildName}. Decyzja o odrzucenie jej została podjęta przez większość personelu serwera.\n\n` +
				'Nie będziesz mógł/mogła ponownie wejść na serwer.',
			'Romanian': (guildName: string) =>
				`Cererea ta de a te alătura serverului ${guildName} a fost respinsă. Această decizie a fost luată de majoritatea personalului serverului.\n\n` +
				'Nu vei putea să te mai întorci pe server.',
		},
		vote: {
			accept: {
				'English': 'Accept',
				// TODO: Add Hungarian localisations.
				'Polish': 'Akceptuj',
				'Romanian': 'Acceptă',
			},
			acceptMultiple: {
				'English': (votesNeeded: number) => {
					const numberExpression = Expressions.english.methods.pluralise(
						votesNeeded.toString(),
						'more vote',
						'more votes',
					);

					return `Accept (${numberExpression} needed)`;
				},
				// TODO: Add Hungarian localisations.
				'Polish': (votesNeeded: number) => {
					const numberExpression = Expressions.polish.methods.pluralise(
						votesNeeded.toString(),
						'głosu',
						'głosów',
						'głosów',
					);

					return `Akceptuj (potrzeba jeszcze ${numberExpression})`;
				},
				'Romanian': (votesNeeded: number) => {
					const numberExpression = Expressions.romanian.methods.pluralise(votesNeeded.toString(), 'vot', 'voturi');

					return `Acceptă (sunt necesare încă ${numberExpression})`;
				},
			},
			reject: {
				'English': 'Reject',
				// TODO: Add Hungarian localisations.
				'Polish': 'Odrzuć',
				'Romanian': 'Refuză',
			},
			rejectMultiple: {
				'English': (votesNeeded: number) => {
					const numberExpression = Expressions.english.methods.pluralise(
						votesNeeded.toString(),
						'more vote',
						'more votes',
					);

					return `Reject (${numberExpression} needed)`;
				},
				// TODO: Add Hungarian localisations.
				'Polish': (votesNeeded: number) => {
					const numberExpression = Expressions.polish.methods.pluralise(
						votesNeeded.toString(),
						'głosu',
						'głosów',
						'głosów',
					);

					return `Odrzuć (potrzeba jeszcze ${numberExpression})`;
				},
				'Romanian': (votesNeeded: number) => {
					const numberExpression = Expressions.romanian.methods.pluralise(votesNeeded.toString(), 'vot', 'voturi');

					return `Refuză (sunt necesare încă ${numberExpression})`;
				},
			},
			failed: {
				'English': 'Failed to register vote.',
				// TODO: Add Hungarian localisations.
				'Polish': 'Nie udało się zarejestrować głosu.',
				'Romanian': 'Nu am reușit să înregistrăm votul.',
			},
			failedToUpdateVerificationState: {
				'English': 'Failed to update verification state.',
				// TODO: Add Hungarian localisations.
				'Polish': 'Nie udało się zaktualizować stanu weryfikacji.',
				'Romanian': 'Nu am reușit să actualizăm starea de verificare.',
			},
			alreadyVotedToAccept: {
				'English': 'You have already voted in favour of this user\'s entry request being accepted.',
				// TODO: Add Hungarian localisations.
				'Polish': 'Już wcześniej głosowałeś na rzecz akceptacji prośby użytkownika o dołączenie do serwera.',
				'Romanian': 'Ai votat deja în favoarea acceptării cererii utilizatorului de a se alătura serverului.',
			},
			alreadyVotedToReject: {
				'English': 'You have already voted against this user\'s entry request being accepted.',
				// TODO: Add Hungarian localisations.
				'Polish': 'Już wcześniej głosowałeś przeciwko akceptacji prośby użytkownika o dołączenie do serwera.',
				'Romanian': 'Ai votat deja împotriva cererii utilizatorului de a se alătura serverului.',
			},
			stanceOnVoteChanged: {
				'English': 'Your stance in this vote has been changed.',
				// TODO: Add Hungarian localisations.
				'Polish': 'Zmieniono twoją pozycję w głosowaniu.',
				'Romanian': 'S-a schimbat poziția ta în acest vot.',
			},
		},
	};

	// Do not localise; this is a public feedback message.
	static readonly submittedBy = {
		'English': 'Submitted by',
	};

	// Do not localise; this is a public feedback message.
	static readonly submittedAt = {
		'English': 'Submitted at',
	};

	// Do not localise; this is a public feedback message.
	static readonly markAsResolved = {
		'English': 'Mark issue as resolved',
	};

	// Do not localise; this is a public feedback message.
	static readonly markAsUnresolved = {
		'English': 'Mark issue as unresolved',
	};

	// Do not localise; this is a public feedback message.
	static readonly alreadyMarkedAsResolved = {
		'English': 'This issue has already been marked as resolved.',
	};

	// Do not localise; this is a public feedback message.
	static readonly alreadyMarkedAsUnresolved = {
		'English': 'This issue has already been marked as unresolved.',
	};

	static readonly reports = {
		// Do not localise; this is a public feedback message.
		reportedUsers: {
			'English': 'Reported users',
		},
		// Do not localise; this is a public feedback message.
		reasonForReport: {
			'English': 'Reason for report',
		},
		// Do not localise; this is a public feedback message.
		linkToMessage: {
			'English': 'Link to message',
		},
		// Do not localise; this is a public feedback message.
		noLinkToMessageProvided: {
			'English': 'No link to message provided.',
		},
		// Do not localise; this is a public feedback message.
		previousInfractions: {
			'English': (username: string) => `Previous infractions of ${username}`,
		},
	};

	static readonly suggestions = {
		// Do not localise; this is a public feedback message.
		suggestion: {
			'English': 'Suggestion',
		},
	};
}

export { Services };
