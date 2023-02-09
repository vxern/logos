class Roles {
	static readonly proficiency = {
		name: {
			'English': 'Proficiency',
			'Hungarian': 'Jártasság',
			'Polish': 'Biegłość',
			'Romanian': 'Competență',
		},
		description: {
			'English': 'Roles representing the user\'s language proficiency and knowledge of the language.',
			'Hungarian': 'A felhasználó nyelvi jártasságát kifejező rangok.',
			'Polish': 'Rangi odzwierciedlające biegłość oraz znajomość języka użytkownika.',
			'Romanian': 'Roluri care simbolizează competența lingvistică a utilizatorului și cunoașterea limbii.',
		},
		roles: {
			beginner: {
				name: {
					'English': 'Beginner',
					'Hungarian': 'Kezdő',
					'Polish': 'Początkujący',
					'Romanian': 'Începător',
				},
				// Keep descriptions under 100 characters. (The Polish string is exactly 100 characters long.)
				description: {
					'English': 'I am just beginning to learn; I have limited understanding and I know a couple basic phrases.',
					'Hungarian':
						'Csak most kezdek tanulni, korlátozottan értem a nyelvet, esetleg tudok egy pár gyakori kifejezést.',
					'Polish':
						'Właśnie co zaczynam się uczyć; mam ograniczone zrozumienie, i znam tylko kilka podstawowych zwrotów.',
					'Romanian': 'Abia ce încep să învăț; am o înțelegere limitată, și cunosc doar câteva fraze de bază.',
				},
			},
			intermediate: {
				name: {
					'English': 'Intermediate',
					'Hungarian': 'Középhaladó',
					'Polish': 'Średni',
					'Romanian': 'Mediu',
				},
				description: {
					'English': 'I have been learning for a while; I have decent understanding and I can sustain a conversation.',
					'Hungarian': 'Már tanulok egy ideje, egész jól értem a nyelvet, tudok beszélgetést folytatni.',
					'Polish': 'Uczę się od jakiegoś czasu; mam niezłe zrozumienie, oraz potrafię utrzymywać się w rozmowie.',
					'Romanian': 'Învăț de ceva timp; am o înțelegere adecvată, și pot întreține o conversație.',
				},
			},
			advanced: {
				name: {
					'English': 'Advanced',
					'Hungarian': 'Haladó',
					'Polish': 'Zaawansowany',
					'Romanian': 'Avansat',
				},
				description: {
					'English':
						'I have been learning for a long time; I have firm understanding and I can speak without much effort.',
					'Hungarian': 'Régóta tanulok, alaposan értem a nyelvet, és minimális erőfeszítéssel tudok beszélni',
					'Polish': 'Uczę się od długiego czasu; mam solidne zrozumienie, oraz potrafię mówić bez większego wysiłku.',
					'Romanian': 'Învăț de mai mult timp; am o înțelegere firmă, și pot vorbi fără un efort mai mare.',
				},
			},
			native: {
				name: {
					'English': 'Native',
					'Hungarian': 'Anyanyelvi',
					'Polish': 'Tubylec',
					'Romanian': 'Nativ',
				},
				description: {
					'English': 'I was brought up speaking the language; I understand and I can speak about everything with ease.',
					'Hungarian': 'Ezzel a nyelvvel nőttem fel, szinte bármit könnyedén megértek és ki is tudok fejezni.',
					'Polish': 'Dorastałem z językiem; wszystko rozumiem i z łatwością prowadzę rozmowę o czymkolwiek.',
					'Romanian':
						'Am fost crescut cu limba; înțeleg totul și pot avea o conversație despre orice subiect cu ușurință.',
				},
			},
		},
	};

	static readonly personalisation = {
		name: {
			'English': 'Personalisation',
			'Hungarian': 'Testreszabás',
			'Polish': 'Personalizacja',
			'Romanian': 'Personalizare',
		},
		description: {
			'English': 'Roles used to personalise one\'s server profile.',
			'Hungarian': 'Rangok a szerveri profilod személyre szabására.',
			'Polish': 'Rangi do personalizacji profilu na serwerze.',
			'Romanian': 'Roluri utilizate pentru personalizarea profilului de server.',
		},
		categories: {
			orthography: {
				name: {
					'English': 'Orthography',
					'Hungarian': 'Ortográfia',
					'Polish': 'Ortografia',
					'Romanian': 'Ortografie',
				},
				description: {
					'English': 'Roles related to various orthographies.',
					'Hungarian': 'Különféle ortográfiákkal kapcolatos rangok.',
					'Polish': 'Rangi reprezentujące różne ortografie.',
					'Romanian': 'Roluri care reprezintă diferite ortografii.',
				},
				roles: {
					idinist: {
						name: {
							'English': 'Îdinist',
							'Hungarian': 'Îdinista',
							'Polish': 'Îdinista',
							'Romanian': 'Îdinist',
						},
						description: {
							'English': 'I am a proponent of Îdinism.',
							'Hungarian': 'Az Îdinizmus képviselője vagyok.',
							'Polish': 'Jestem proponentem îdinizmu.',
							'Romanian': 'Sunt un proponent al îdinismului.',
						},
					},
				},
			},
			gender: {
				name: {
					'English': 'Gender',
					'Hungarian': 'Nem',
					'Polish': 'Płeć',
					'Romanian': 'Gen',
				},
				description: {
					'English': 'Roles defining one\'s gender.',
					'Hungarian': 'Valakinek a nemét leíró rangok.',
					'Polish': 'Rangi reprezentujące płeć.',
					'Romanian': 'Roluri care reprezintă genul.',
				},
				roles: {
					male: {
						name: {
							'English': 'Male',
							'Hungarian': 'Férfi',
							'Polish': 'Mężczyzna',
							'Romanian': 'Bărbat',
						},
						description: {
							'English': 'I am of the male persuasion.',
							'Hungarian': 'Férfiként tekintek magamra.',
							'Polish': 'Określam się jako mężczyzna.',
							'Romanian': 'Mă identific ca bărbat.',
						},
					},
					female: {
						name: {
							'English': 'Female',
							'Hungarian': 'Nő',
							'Polish': 'Kobieta',
							'Romanian': 'Femeie',
						},
						description: {
							'English': 'I am of the female persuasion.',
							'Hungarian': 'Nőként tekintek magamra.',
							'Polish': 'Określam się jako kobieta.',
							'Romanian': 'Mă identific ca femeie.',
						},
					},
					transgender: {
						name: {
							'English': 'Transgender',
							'Hungarian': 'Transznemű',
							'Polish': 'Transpłciowy/a',
							'Romanian': 'Transgen',
						},
						description: {
							'English': 'I am transgender.',
							'Hungarian': 'Transznemű vagyok.',
							'Polish': 'Jestem osobą transpłciową.',
							'Romanian': 'Sunt o persoană transgen.',
						},
					},
					nonbinary: {
						name: {
							'English': 'Non-binary',
							'Hungarian': 'Nembináris',
							'Polish': 'Niebinarny/a',
							'Romanian': 'Non-binar/ă',
						},
						description: {
							'English': 'I am non-binary.',
							'Hungarian': 'Nembináris vagyok.',
							'Polish': 'Jestem osobą niebinarną.',
							'Romanian': 'Sunt o persoană transgen.',
						},
					},
				},
			},
			abroad: {
				name: {
					'English': 'Abroad',
					'Hungarian': 'Külföldön',
					'Polish': 'Zagranicą',
					'Romanian': 'În străinătate',
				},
				description: {
					'English': 'Roles related to the abroad.',
					'Hungarian': 'Külföldi élettel kapcsolatos rangok.',
					'Polish': 'Rangi związane z zagranicą.',
					'Romanian': 'Roluri asociate cu viața în străinătate.',
				},
				roles: {
					diasporan: {
						name: {
							'English': 'Diasporan',
							'Hungarian': 'Külhoni',
							'Polish': 'Diasporanin',
							'Romanian': 'Diasporan',
						},
						// Keep under 100 characters.
						description: {
							'English': 'I am a native, or a child of natives, but I have been brought up abroad.',
							'Hungarian': 'Anyanyelviként/anyanyelviek gyerekeként, de külföldön nőttem fel.',
							'Polish': 'Jestem tubylcem, lub dzieckiem tubylców, ale dorastałem za granicą.',
							'Romanian': 'Sunt nativ sau părinții mei sunt nativi, dar am crescut în străinatate.',
						},
					},
				},
			},
		},
	};

	static readonly learning = {
		name: {
			'English': 'Learning',
			'Hungarian': 'Tanulás',
			'Polish': 'Nauka',
			'Romanian': 'Studiu',
		},
		description: {
			'English': 'Roles applied in teaching and learning the language.',
			'Hungarian': 'A nyelv tanulásához és tanításához használt rangok.',
			'Polish': 'Rangi stosowane w nauczaniu i uczeniu się języka.',
			'Romanian': 'Roluri aplicate în predarea și învățarea limbii.',
		},
		roles: {
			classroomAttendee: {
				name: {
					'English': 'Classroom Attendee',
					'Hungarian': 'Leckerésztvevő',
					'Polish': 'Uczestnik zajęć',
					'Romanian': 'Participant la clasă',
				},
				// Keep under 100 characters.
				description: {
					'English':
						'I attend sessions in the classroom channel and would like to be notified when a session takes place.',
					'Hungarian': 'Részt veszek a hangcsatornán tartott leckéken, és szeretnék értesítést kapni, amikor van egy.',
					'Polish':
						'Chciał(a)bym uczęszczać na zajęcia, i chciał(a)bym być powiadamiany/a gdy takie zajęcie ma miejsce.',
					'Romanian': 'Particip la sesiuni și aș dori să fiu notificat/ă atunci când are loc o astfel de sesiune.',
				},
			},
			correctMe: {
				name: {
					'English': 'Correct Me',
					'Hungarian': 'Javíts ki',
					'Polish': 'Poprawiaj mnie',
					'Romanian': 'Corectează-mă',
				},
				description: {
					'English': '"I think, therefore I make mistakes." - Please do correct me.',
					'Hungarian': '"Gondolkodom, tehát hibázom." - Kérlek, javíts ki, ha szükséges.',
					'Polish': '"Myślę, więc popełniam błędy." - Proszę, popraw mnie, jeśli popełnię błąd.',
					'Romanian': '"Cuget, deci fac greșeli." - Vă rog, corectați-mă.',
				},
			},
			dailyPhrase: {
				name: {
					'English': 'Daily Phrase',
					'Hungarian': 'A nap kifejezése',
					'Polish': 'Wyrażenie dnia',
					'Romanian': 'Expresia zilei',
				},
				description: {
					'English': 'I want to be notified when a new daily phrase is posted.',
					'Hungarian': 'A Nap Kifejezése',
					'Polish': 'Chcę zostać powiadomiony/a, gdy będzie opublikowana nowe wyrażenie dnia.',
					'Romanian': 'Vreau să fiu anunțat/ă atunci când este postată o nouă expresie a zilei.',
				},
			},
			voicechatter: {
				name: {
					'English': 'Voicechatter',
					'Hungarian': 'Voicechatter',
					'Polish': 'Voicechatter',
					'Romanian': 'Voicechatter',
				},
				description: {
					'English': 'I enjoy attending (un)announced VC sessions and speaking with other people.',
					'Hungarian': 'Szeretek részt venni (akár nem bejelentett) beszélgetős eseményeken a hangcsatornában.',
					'Polish': 'Lubię uczestniczyć w (nie)zapowiedzianych sesjach VC oraz rozmawiać z innymi ludźmi.',
					'Romanian': 'Îmi place să particip la sesii VC (ne)anunțate și să vorbesc cu alte persoane.',
				},
			},
		},
	};

	static readonly ethnicity = {
		name: {
			'English': 'Ethnicity',
			'Hungarian': 'Származás',
			'Polish': 'Pochodzenie',
			'Romanian': 'Etnie',
		},
		description: {
			'English': 'Roles identifying one\'s ethnicity.',
			'Hungarian': 'Valakinek az etnikumát leíró rangok.',
			'Polish': 'Rangi reprezentujące pochodzenie etniczne.',
			'Romanian': 'Roluri care reprezintă etnia.',
		},
		languages: {
			'Armenian': [
				// 'Tat' is a language. 'Armeno-' refers to Armenians.
				// https://en.wikipedia.org/wiki/Armeno-Tats
				{
					name: {
						'English': 'Armeno-Tat',
						// TODO: Add Hungarian translation.
						'Polish': 'Armeno-Tackie',
						'Romanian': 'Armeno-Tată',
					},
					description: {
						'English': 'I am of Armeno-Tat heritage.',
						// TODO: Add Hungarian translation.
						'Polish': 'Z pochodzenia jestem Armeno-tatem.',
						'Romanian': 'Sunt de origine armeno-tată.',
					},
				},
				// https://en.wikipedia.org/wiki/Circassians
				{
					name: {
						'English': 'Circassian',
						'Hungarian': 'Cserkesz',
						'Polish': 'Czerkieskie',
						'Romanian': 'Cercheză',
					},
					description: {
						'English': 'I am of Circassian heritage.',
						'Hungarian': 'Cserkesz származású vagyok.',
						'Polish': 'Z pochodzenia jestem Czerkiesem.',
						'Romanian': 'Sunt de origine cercheză.',
					},
				},
				// https://en.wikipedia.org/wiki/Hemshin_peoples
				{
					name: {
						'English': 'Hemshin',
						'Hungarian': 'Hemsin',
						'Polish': 'Hemszyńskie',
						'Romanian': 'Hemșină',
					},
					description: {
						'English': 'I am of Hemshin heritage.',
						'Hungarian': 'Hemsin származású vagyok.',
						'Polish': 'Z pochodzenia jestem Hemszynem.',
						'Romanian': 'Sunt de origine hemșină.',
					},
				},
				// https://en.wikipedia.org/wiki/Hidden_Armenians
				{
					name: {
						'English': 'Crypto-Armenian',
						// TODO: Add Hungarian translation.
						'Polish': 'Krypto-Ormiańskie',
						'Romanian': 'Cripto-Armeană',
					},
					description: {
						'English': 'I am of Crypto-Armenian heritage.',
						// TODO: Add Hungarian translation.
						'Polish': 'Z pochodzenia jestem Krypto-ormianinem.',
						'Romanian': 'Sunt de origine cripto-armeană.',
					},
				},
			],
			'Romanian': [
				{
					name: {
						'English': 'Aromanian',
						'Hungarian': 'Aromán',
						'Polish': 'Arumuńskie',
						'Romanian': 'Aromână',
					},
					description: {
						'English': 'I am of Aromanian heritage.',
						'Hungarian': 'Aromán származású vagyok.',
						'Polish': 'Z pochodzenia jestem Arumunem.',
						'Romanian': 'Sunt de origine aromână.',
					},
				},
				{
					name: {
						'English': 'Istro-Romanian',
						'Hungarian': 'Isztrorománok',
						'Polish': 'Istrorumuńskie',
						'Romanian': 'Istroromână',
					},
					description: {
						'English': 'I am of Istro-Romanian heritage.',
						'Hungarian': 'Isztroromán származású vagyok.',
						'Polish': 'Z pochodzenia jestem istrorumunem.',
						'Romanian': 'Sunt de origine istroromână.',
					},
				},
				{
					name: {
						'English': 'Megleno-Romanian',
						'Hungarian': 'Meglenoromán',
						'Polish': 'Meglenorumuńskie',
						'Romanian': 'Meglenoromână',
					},
					description: {
						'English': 'I am of Megleno-Romanian heritage.',
						'Hungarian': 'Meglenoromán származású vagyok.',
						'Polish': 'Z pochodzenia jestem meglenorumunem.',
						'Romanian': 'Sunt de origine meglenoromână.',
					},
				},
				{
					name: {
						'English': 'Romani',
						// TODO: Add Hungarian translation.
						'Polish': 'Romskie',
						'Romanian': 'Romă',
					},
					description: {
						'English': 'I am of Romani heritage.',
						// TODO: Add Hungarian translation.
						'Polish': 'Z pochodzenia jestem Romem.',
						'Romanian': 'Sunt de origine romă.',
					},
				},
				{
					name: {
						'English': 'Hungarian (Szekler, Csango)',
						// TODO: Add Hungarian translation.
						'Polish': 'Węgierskie (sekelowskie, czangowskie)',
						'Romanian': 'Maghiară (secuiască, ceangăiască)',
					},
					description: {
						'English': 'I am of Hungarian heritage.',
						// TODO: Add Hungarian translation.
						'Polish': 'Z pochodzenia jestem Węgrem.',
						'Romanian': 'Sunt de origine maghiară.',
					},
				},
				{
					name: {
						'English': 'German (Saxon, Swabian)',
						// TODO: Add Hungarian translation.
						'Polish': 'Niemieckie (saksońskie, szwabskie)',
						'Romanian': 'Germană (sasă, șvabă)',
					},
					description: {
						'English': 'I am of German heritage.',
						// TODO: Add Hungarian translation.
						'Polish': 'Z pochodzenia jestem Niemcem.',
						'Romanian': 'Sunt de origine germană.',
					},
				},
			],
		},
	};

	static readonly dialects = {
		name: {
			'English': 'Dialects',
			'Hungarian': 'Dialektusok',
			'Polish': 'Dialekty',
			'Romanian': 'Dialecte',
		},
		description: {
			'English': 'Roles specifying which dialect of the language one is learning.',
			'Hungarian': 'Azt kifejező rangok, hogy valaki melyik dialektusát tanulja a nyelvnek.',
			'Polish': 'Rangi określające, jakiego dialektu języka się uczy.',
			'Romanian': 'Roluri care specifică ce dialect al limbii se învață.',
		},
		languages: {
			'Armenian': [
				{
					name: {
						'English': 'Western Armenian',
						'Hungarian': 'Nyugati',
						'Polish': 'Zachodni',
						'Romanian': 'Apuseană',
					},
					description: {
						'English': 'I am learning Western Armenian.',
						'Hungarian': 'Nyugati-örményt tanulok.',
						'Polish': 'Uczę się zachodnioormiańskiego.',
						'Romanian': 'Învăț armeana de vest.',
					},
				},
				{
					name: {
						'English': 'Eastern Armenian',
						'Hungarian': 'Keleti',
						'Polish': 'Wschodni',
						'Romanian': 'Răsăriteană',
					},
					description: {
						'English': 'I am learning Eastern Armenian.',
						'Hungarian': 'Keleti-örményt tanulok.',
						'Polish': 'Uczę się wschodnioormiańskiego.',
						'Romanian': 'Învăț armeana de est.',
					},
				},
				{
					name: {
						'English': 'Karabakh Armenian',
						'Hungarian': 'Karabahi örmény',
						'Polish': 'Karabaski',
						'Romanian': 'Armeană din Karabahul de Munte',
					},
					description: {
						'English': 'I am learning Karabakh Armenian.',
						'Hungarian': 'Hegyi-karabahi örményt tanulok.',
						'Polish': 'Uczę się mowy karabaskiej.',
						'Romanian': 'Învăț armeana vorbită în Karabahul de Munte.',
					},
				},
			],
		},
	};

	static readonly regions = {
		name: {
			'English': 'Regions',
			'Hungarian': 'Térségek',
			'Polish': 'Obszary',
			'Romanian': 'Regiuni',
		},
		description: {
			'English': 'Roles specifying which area of the country one originates from.',
			'Hungarian': 'A származási régiód megadására szolgáló rangok.',
			'Polish': 'Rangi określające, z jakiego obszaru kraju się pochodzi.',
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
