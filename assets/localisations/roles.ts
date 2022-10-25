class Roles {
	static readonly proficiency = {
		name: {
			'English': 'Proficiency',
			'Polish': 'Biegłość',
			'Romanian': 'Competență',
		},
		description: {
			'English':
				'Roles representing the user\'s language proficiency and knowledge of the language.',
			'Polish':
				'Role odzwierciedlające biegłość oraz znajomość języka użytkownika.',
			'Romanian':
				'Roluri care simbolizează competența lingvistică a utilizatorului și cunoașterea limbii.',
		},
		roles: {
			beginner: {
				name: {
					'English': 'Beginner',
					'Polish': 'Początkujący',
					'Romanian': 'Începător',
				},
				// Keep descriptions under 100 characters. (The Polish string is exactly 100 characters long.)
				description: {
					'English':
						'I am just beginning to learn; I have limited understanding and I know a couple basic phrases.',
					'Polish':
						'Właśnie co zaczynam się uczyć; mam ograniczone zrozumienie, i znam tylko kilka podstawowych zwrotów.',
					'Romanian':
						'Abia ce încep să învăț; am o înțelegere limitată, și cunosc doar câteva fraze de bază.',
				},
			},
			intermediate: {
				name: {
					'English': 'Intermediate',
					'Polish': 'Średni',
					'Romanian': 'Mediu',
				},
				description: {
					'English':
						'I have been learning for a while; I have decent understanding and I can sustain a conversation.',
					'Polish':
						'Uczę się od jakiegoś czasu; mam niezłe zrozumienie, oraz potrafię utrzymywać się w rozmowie.',
					'Romanian':
						'Învăț de ceva timp; am o înțelegere adecvată, și pot întreține o conversație.',
				},
			},
			advanced: {
				name: {
					'English': 'Advanced',
					'Polish': 'Zaawansowany',
					'Romanian': 'Avansat',
				},
				description: {
					'English':
						'I have been learning for a long time; I have firm understanding and I can speak without much effort.',
					'Polish':
						'Uczę się od długiego czasu; mam solidne zrozumienie, oraz potrafię mówić bez większego wysiłku.',
					'Romanian':
						'Învăț de mai mult timp; am o înțelegere firmă, și pot vorbi fără un efort mai mare.',
				},
			},
			native: {
				name: {
					'English': 'Native',
					'Polish': 'Tubylec',
					'Romanian': 'Nativ',
				},
				description: {
					'English':
						'I was brought up speaking the language; I understand and I can speak about everything with ease.',
					'Polish':
						'Dorastałem z językiem; wszystko rozumiem i z łatwością prowadzę rozmowę o czymkolwiek.',
					'Romanian':
						'Am fost crescut cu limba; înțeleg totul și pot avea o conversație despre orice subiect cu ușurință.',
				},
			},
		},
	};

	static readonly personalisation = {
		name: {
			'English': 'Personalisation',
			'Polish': 'Personalizacja',
			'Romanian': 'Personalizare',
		},
		description: {
			'English': 'Roles used to personalise one\'s server profile.',
			'Polish': 'Role do personalizacji swojego profilu na serwerze.',
			'Romanian':
				'Roluri utilizate pentru a-și personaliza profilul de server.',
		},
		categories: {
			orthography: {
				name: {
					'English': 'Orthography',
					'Polish': 'Ortografia',
					'Romanian': 'Ortografie',
				},
				description: {
					'English': 'Roles related to various orthographies.',
					'Polish': 'Role reprezentujące różne ortografie.',
					'Romanian': 'Roluri care reprezintă diferite ortografii.',
				},
				roles: {
					idinist: {
						name: {
							'English': 'Îdinist',
							'Polish': 'Îdinista',
							'Romanian': 'Îdinist',
						},
						description: {
							'English': 'I am a proponent of Îdinism.',
							'Polish': 'Jestem proponentem îdinizmu.',
							'Romanian': 'Sunt un proponent al îdinismului.',
						},
					},
				},
			},
			gender: {
				name: {
					'English': 'Gender',
					'Polish': 'Płeć',
					'Romanian': 'Gen',
				},
				description: {
					'English': 'Roles defining one\'s gender.',
					'Polish': 'Role reprezentujące płeć.',
					'Romanian': 'Roluri care reprezintă genul.',
				},
				roles: {
					male: {
						name: {
							'English': 'Male',
							'Polish': 'Mężczyzna',
							'Romanian': 'Bărbat',
						},
						description: {
							'English': 'I am of the male persuasion.',
							'Polish': 'Określam się jako mężczyzna.',
							'Romanian': 'Mă identific ca bărbat.',
						},
					},
					female: {
						name: {
							'English': 'Female',
							'Polish': 'Kobieta',
							'Romanian': 'Femeie',
						},
						description: {
							'English': 'I am of the female persuasion.',
							'Polish': 'Określam się jako kobieta.',
							'Romanian': 'Mă identific ca femeie.',
						},
					},
					transgender: {
						name: {
							'English': 'Transgender',
							'Polish': 'Transpłciowy/a',
							'Romanian': 'Transgen',
						},
						description: {
							'English': 'I am transgender.',
							'Polish': 'Jestem osobą transpłciową.',
							'Romanian': 'Sunt o persoană transgen.',
						},
					},
					nonBinary: {
						name: {
							'English': 'Non-binary',
							'Polish': 'Niebinarny/a',
							'Romanian': 'Non-binar/ă',
						},
						description: {
							'English': 'I am non-binary.',
							'Polish': 'Jestem osobą niebinarną.',
							'Romanian': 'Sunt o persoană transgen.',
						},
					},
				},
			},
			abroad: {
				name: {
					'English': 'Abroad',
					'Polish': 'Zagranicą',
					'Romanian': 'În străinătate',
				},
				description: {
					'English': 'Roles related to the abroad.',
					'Polish': 'Role związane z zagranicą.',
					'Romanian': 'Roluri asociate cu trăire în străinătate.',
				},
				roles: {
					diasporan: {
						name: {
							'English': 'Diasporan',
							'Polish': 'Diasporanin',
							'Romanian': 'Diasporan',
						},
						// Keep under 100 characters.
						description: {
							'English':
								'I am a native, or a child of natives, but I have been brought up abroad.',
							'Polish':
								'Jestem tubylcem, lub dzieckiem tubylców, ale dorastałem za granicą.',
							'Romanian':
								'Sunt nativ sau părinții mei sunt nativi, dar am crescut în străinatate.',
						},
					},
				},
			},
		},
	};

	static readonly learning = {
		name: {
			'English': 'Learning',
			'Polish': 'Nauka',
			'Romanian': 'Studiu',
		},
		description: {
			'English': 'Roles applied in teaching and learning the language.',
			'Polish': 'Role stosowane w nauczaniu i uczeniu się języka.',
			'Romanian': 'Roluri aplicate în predarea și învățarea limbii.',
		},
		roles: {
			classroomAttendee: {
				name: {
					'English': 'Classroom Attendee',
					'Polish': 'Uczestnik Zajęć',
					'Romanian': 'Participant la Clasă',
				},
				// Keep under 100 characters.
				description: {
					'English':
						'I attend sessions in the classroom channel and would like to be notified when a session takes place.',
					'Polish':
						'Chciał(a)bym uczęszczać na zajęcia, i chciał(a)bym być powiadamiany/a gdy takie zajęcie ma miejsce.',
					'Romanian':
						'Particip la sesiuni și aș dori să fiu notificat/ă atunci când are loc o astfel de sesiune.',
				},
			},
			correctMe: {
				name: {
					'English': 'Correct Me',
					'Polish': 'Poprawiaj Mnie',
					'Romanian': 'Corectează-mă',
				},
				description: {
					'English':
						'"I think, therefore I make mistakes." - Please do correct me.',
					'Polish':
						'"Myślę, więc popełniam błędy." - Proszę, popraw mnie, jeśli popełnię błąd.',
					'Romanian': '"Cuget, deci fac greșeli." - Vă rog, corectați-mă.',
				},
			},
			dailyPhrase: {
				name: {
					'English': 'Daily Phrase',
					'Polish': 'Wyrażenie Dnia',
					'Romanian': 'Expresia Zilei',
				},
				description: {
					'English': 'I want to be notified when a new daily phrase is posted.',
					'Polish':
						'Chcę zostać powiadomiony/a, gdy będzie opublikowana nowe wyrażenie dnia.',
					'Romanian':
						'Vreau să fiu anunțat/ă atunci când este postată o nouă expresie a zilei.',
				},
			},
			voicechatter: {
				name: {
					'English': 'Voicechatter',
					'Polish': 'Voicechatter',
					'Romanian': 'Voicechatter',
				},
				description: {
					'English':
						'I enjoy attending (un)announced VC sessions and speaking with other people.',
					'Polish':
						'Lubię uczestniczyć w (nie)zapowiedzianych sesjach VC oraz rozmawiać z innymi ludźmi.',
					'Romanian':
						'Îmi place să particip la sesii VC (ne)anunțate și să vorbesc cu alte persoane.',
				},
			},
		},
	};

	static readonly ethnicity = {
		name: {
			'English': 'Ethnicity',
			'Polish': 'Pochodzenie',
			'Romanian': 'Etnie',
		},
		description: {
			'English': 'Roles identifying one\'s ethnicity.',
			'Polish': 'Role reprezentujące pochodzenie etniczne.',
			'Romanian': 'Roluri care reprezintă etnie.',
		},
		languages: {
			'Armenian': [
				// 'Tat' is a language. 'Armeno-' refers to Armenians.
				// https://en.wikipedia.org/wiki/Armeno-Tats
				{
					name: {
						'English': 'Armeno-Tat',
						'Polish': 'Armeno-Tackie',
						'Romanian': 'Armeno-Tată',
					},
					description: {
						'English': 'I am of Armeno-Tat heritage.',
						'Polish': 'Z pochodzenia jestem armeno-tatem.',
						'Romanian': 'Sunt de origine armeno-tată.',
					},
				},
				// https://en.wikipedia.org/wiki/Circassians
				{
					name: {
						'English': 'Circassian',
						'Polish': 'Czerkieskie',
						'Romanian': 'Cercheză',
					},
					description: {
						'English': 'I am of Circassian heritage.',
						'Polish': 'Z pochodzenia jestem czerkiesem.',
						'Romanian': 'Sunt de origine cercheză.',
					},
				},
				// https://en.wikipedia.org/wiki/Hemshin_peoples
				{
					name: {
						'English': 'Hemshin',
						'Polish': 'Hemszyńskie',
						'Romanian': 'Hemșină',
					},
					description: {
						'English': 'I am of Hemshin heritage.',
						'Polish': 'Z pochodzenia jestem hemszynem.',
						'Romanian': 'Sunt de origine hemșină.',
					},
				},
				// https://en.wikipedia.org/wiki/Hidden_Armenians
				{
					name: {
						'English': 'Crypto-Armenian',
						'Polish': 'Krypto-Ormiańskie',
						'Romanian': 'Cripto-Armeană',
					},
					description: {
						'English': 'I am of Crypto-Armenian heritage.',
						'Polish': 'Z pochodzenia jestem krypto-ormianinem.',
						'Romanian': 'Sunt de origine cripto-armeană.',
					},
				},
			],
			'Romanian': [
				{
					name: {
						'English': 'Aromanian',
						'Polish': 'Arumuńskie',
						'Romanian': 'Aromână',
					},
					description: {
						'English': 'I am of Aromanian heritage.',
						'Polish': 'Z pochodzenia jestem arumunem.',
						'Romanian': 'Sunt de origine aromână.',
					},
				},
				{
					name: {
						'English': 'Istro-Romanian',
						'Polish': 'Istrorumuńskie',
						'Romanian': 'Istroromână',
					},
					description: {
						'English': 'I am of Istro-Romanian heritage.',
						'Polish': 'Z pochodzenia jestem istrorumunem.',
						'Romanian': 'Sunt de origine istroromână.',
					},
				},
				{
					name: {
						'English': 'Megleno-Romanian',
						'Polish': 'Meglenorumuńskie',
						'Romanian': 'Meglenoromână',
					},
					description: {
						'English': 'I am of Megleno-Romanian heritage.',
						'Polish': 'Z pochodzenia jestem meglenorumunem.',
						'Romanian': 'Sunt de origine meglenoromână.',
					},
				},
			],
		},
	};

	static readonly dialects = {
		name: {
			'English': 'Dialects',
			'Polish': 'Dialekty',
			'Romanian': 'Dialecte',
		},
		description: {
			'English':
				'Roles specifying which dialect of the language one is learning.',
			'Polish': 'Role określające, jakiego dialektu języka się uczy.',
			'Romanian': 'Roluri care specifică ce dialect al limbii se învață.',
		},
		languages: {
			'Armenian': [
				{
					name: {
						'English': 'Western Armenian',
						'Polish': 'Zachodni',
						'Romanian': 'Apuseană',
					},
					description: {
						'English': 'I am learning Western Armenian.',
						'Polish': 'Uczę się zachodnioormiańskiego.',
						'Romanian': 'Învăț armeana de vest.',
					},
				},
				{
					name: {
						'English': 'Eastern Armenian',
						'Polish': 'Wschodni',
						'Romanian': 'Răsăriteană',
					},
					description: {
						'English': 'I am learning Eastern Armenian.',
						'Polish': 'Uczę się wschodnioormiańskiego.',
						'Romanian': 'Învăț armeana de est.',
					},
				},
				{
					name: {
						'English': 'Karabakh Armenian',
						'Polish': 'Karabaski',
						'Romanian': 'Armeană din Karabahul de Munte',
					},
					description: {
						'English': 'I am learning Karabakh Armenian.',
						'Polish': 'Uczę się ormiańskiego karabaskiego.',
						'Romanian': 'Învăț armeana vorbită în Karabahul de Munte.',
					},
				},
			],
		},
	};

	static readonly regions = {
		name: {
			'English': 'Regions',
			'Polish': 'Obszary',
			'Romanian': 'Regiuni',
		},
		description: {
			'English':
				'Roles specifying which area of the country one originates from.',
			'Polish': 'Role określające, z jakiego obszaru kraju się pochodzi.',
			'Romanian': 'Roluri care specifică din care regiune se vine.',
		},
		languages: {
			'Armenian': [{
				name: {
					'English': 'Aragats\'otn / Արագածոտն',
				},
			}, {
				name: {
					'English': 'Ararat / Արարատ',
				},
			}, {
				name: {
					'English': 'Armavir / Արմավիր',
				},
			}, {
				name: {
					'English': 'Geghark\'unik\' / Գեղարքունիք',
				},
			}, {
				name: {
					'English': 'Kotayk\' / Կոտայք',
				},
			}, {
				name: {
					'English': 'Lorri / Լոռի',
				},
			}, {
				name: {
					'English': 'Shirak / Շիրակ',
				},
			}, {
				name: {
					'English': 'Syunik\' / Սյունիք',
				},
			}, {
				name: {
					'English': 'Tavush / Տավուշ',
				},
			}, {
				name: {
					'English': 'Vayots\' Dzor / Վայոց Ձոր',
				},
			}, {
				name: {
					'English': 'Yerevan / Երևան',
				},
			}],
			'Belarusian': [{
				name: {
					'English': 'Brest / Брэсцкая',
				},
			}, {
				name: {
					'English': 'Hrodna / Гродзенская',
				},
			}, {
				name: {
					'English': 'Homel / Гомельская',
				},
			}, {
				name: {
					'English': 'Mahilyow / Магілёўская',
				},
			}, {
				name: {
					'English': 'Minsk / Мінская',
				},
			}, {
				name: {
					'English': 'Vitsebsk / Вiцебская',
				},
			}],
			'Romanian': [{
				name: {
					'English': 'Banat',
				},
			}, {
				name: {
					'English': 'Basarabia',
				},
			}, {
				name: {
					'English': 'Bucovina',
				},
			}, {
				name: {
					'English': 'Crișana',
				},
			}, {
				name: {
					'English': 'Dobrogea',
				},
			}, {
				name: {
					'English': 'Maramureș',
				},
			}, {
				name: {
					'English': 'Moldova',
				},
			}, {
				name: {
					'English': 'Muntenia',
				},
			}, {
				name: {
					'English': 'Oltenia',
				},
			}, {
				name: {
					'English': 'Transilvania',
				},
			}],
		},
	};
}

export { Roles };
