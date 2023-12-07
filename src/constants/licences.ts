import apache from "./licences/apache";
import bsd from "./licences/bsd";
import mit from "./licences/mit";

const licences = {
	dictionaries: {
		dexonline: {
			name: "dexonline.ro",
			link: "https://dexonline.ro/licenta",
			notices: {
				licence:
					"Baza de definiții a dexonline este liberă; o puteți redistribui și/sau modifica în conformitate cu termenii Licenței Publice Generale GNU așa cum este ea publicată de Free Software Foundation; fie versiunea 2 a Licenței, fie (la latitudinea dumneavoastră) orice versiune ulterioară. Baza de definiții este distribuită cu speranța că vă va fi utilă, dar FĂRĂ NICIO GARANȚIE, chiar fără garanția implicită de vandabilitate sau conformitate unui anumit scop. Citiți Licența Publică Generală GNU pentru detalii. Puteți găsi o copie a Licenței Publice Generale GNU [aici](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html) și o traducere a ei în limba română [aici](https://ro.wikipedia.org/wiki/GPL_%28licen%C8%9B%C4%83,_versiunea_2%29).",
				copyright: "Copyright © 2004-2023 dexonline (https://dexonline.ro)",
			},
		},
		dicolink: {
			name: "dicolink.com",
			link: "https://www.dicolink.com/api/conditionsutilisations",
			faviconLink: "https://www.dicolink.com/imgs/dicolink_128.png",
			notices: {
				licence:
					"En contrepartie de vous permettre d'accéder à l'API Dicolink et aux données Dicolink, vous acceptez de respecter les exigences d'attribution énoncées à l'annexe A ci-après (exigences d'attribution) et ses modifications ultérieures. Vous acceptez que toutes les modifications apportées aux conditions d'attribution entreront en vigueur à la première date à laquelle Dicolink vous en informera par écrit par e-mail ou 30 jours après leur publication. Sous réserve des termes et conditions de cet accord, Dicolink vous accorde par la présente, une licence non exclusive, révocable, non sous-licenciable et non transférable pour utiliser les marques et logos désignés de Dicolink («Marques Dicolink»), uniquement dans la mesure nécessaire pour exécuter le les exigences d'attribution autorisées aux présentes pendant la durée du présent Contrat. Tous les droits non expressément concédés aux présentes sont réservés par Dicolink, et toute utilisation par Vous des Marques de Dicolink, (y compris toute la bonne volonté qui y est associée), sera au nom de Dicolink et en bénéficiera. À la résiliation de cet accord, Vous devez cesser immédiatement d'utiliser toutes les marques Dicolink.",
				badgeLink: "https://www.dicolink.com/imgs/dicolink_badge_a1.png",
			},
		},
		pons: {
			name: "pons.com",
			link: "https://en.pons.com/p/agb-api",
			notices: {
				licence:
					"4. PROPRIETARY RIGHTS; RESTRICTIONS. You acknowledge that PONS, and its licensors retain all right, title and interest in and to the POD-API and the Service. Without limiting the generality of the foregoing, you agree not to: (a) submit any automated or recorded queries to the Service unless otherwise approved in writing by PONS; (b) access the Service with software or means other than the POD-API; (c) copy, reproduce, distribute, or in any other manner duplicate the POD-API or the Service, in whole or in part; (d) sell, lease, license, sublicense, distribute, assign, transfer or otherwise grant any rights in the POD-API or the Service, in whole or in part; (e) modify, port, translate, or create derivative works of the Service; (f) decompile, disassemble, reverse engineer or otherwise attempt to derive, reconstruct, identify or discover any source code, underlying ideas, or algorithms, of the POD-API or Service by any means; (g) remove any proprietary notices, labels or marks from the POD_API or Service; (h) use the POD-API or the Service for purposes of comparison with or benchmarking against products or services made available by third parties; (i) knowingly take any action that would cause any part of thePOD-API or the Service to be placed in the public domain; (j) use the POD-API and/or the Service on websites or in applications morally damaging to juveniles or glorifying violence or on websites or in applications with political, obscene, pornographical or otherwise illegal contents; (k) promote or facilitate unlawful online gambling or disruptive commercial messages or advertisements. You may be held liable for any copyright infringement that results from such any unauthorized uses of the POD-API and the Service.",
			},
		},
		tatoeba: {
			name: "tatoeba.org",
			link: "https://tatoeba.org/en/terms_of_use#section-6",
			notices: {
				licence: `Tatoeba's technical infrastructure uses the default [Creative Commons Attribution 2.0 France license (CC-BY 2.0 FR)](https://creativecommons.org/licenses/by/2.0/fr/) for the use of textual sentences. The BY mention implies a single restriction on the use, reuse, modification and distribution of the sentence: a condition of attribution. That is, using, reusing, modifying and distributing the sentence is only allowed if the name of the author is cited.
        
        The BY mention is also the basic requirement for audio phrases, which can be contributed under different Creative Commons licenses, involving other conditions. Exceptionally, audio sentences may be under other licenses than Creative Commons, especially if the contributor has not validated the authorization to use the audio phrase elsewhere than on our Website.`,
			},
		},
		wiktionary: {
			name: "wiktionary.org",
			link: "https://en.wiktionary.org/wiki/Wiktionary:Copyrights",
			faviconLink:
				"https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/En.wiktionary_favicon.svg/1024px-En.wiktionary_favicon.svg.png",
			notices: {
				licence:
					"The original texts of Wiktionary entries are dual-licensed to the public under both the [Creative Commons Attribution-ShareAlike 3.0 Unported License (CC-BY-SA)](https://en.wiktionary.org/wiki/Wiktionary:CC-BY-SA) and the [GNU Free Documentation License (GFDL)](https://en.wiktionary.org/wiki/Wiktionary:Text_of_the_GNU_Free_Documentation_License). The full text of both licenses can be found at [Wiktionary:Text of Creative Commons Attribution-ShareAlike 3.0 Unported License](https://en.wiktionary.org/wiki/Wiktionary:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License), as well as [Wiktionary:Text of the GNU Free Documentation License](https://en.wiktionary.org/wiki/Wiktionary:Text_of_the_GNU_Free_Documentation_License). Permission is granted to copy, distribute and/or modify the text of all Wiktionary entries under the terms of the Creative Commons Attribution-ShareAlike 3.0 Unported License, and the GNU Free Documentation License, Version 1.1 or any later version published by the [Free Software Foundation](https://en.wikipedia.org/wiki/Free_Software_Foundation); with no Invariant Sections, with no Front-Cover Texts, and with no Back-Cover Texts.",
			},
		},
		wordnik: {
			name: "wordnik.com",
			link: "https://developer.wordnik.com/terms",
			faviconLink: "https://wordnik.com/img/favicon.png",
			notices: {
				licence: `If Wordnik Data is served from Your Site pursuant to this Agreement, You shall accompany all Wordnik Data with a link directly to https://www.wordnik.com/words/\\[specific word\\].

You must also include, in your app or site, wherever you provide attributions or acknowledgments, a "Powered by Wordnik" logo that links to Wordnik.com. Any of the "Powered by Wordnik" logos found at this link: https://www.wordnik.com/media-kit are acceptable. The logo may be used as the anchor for the link. Logos cannot be resized or edited in any fashion without permission. If Wordnik Data is used in alternative media formats, equivalent attribution must be given to Wordnik. Prior written consent from Wordnik is required to use Wordnik Data without attribution.`,
				badgeLink: "https://www.wordnik.com/img/wordnik_badge_a1.png",
			},
		},
		wordsApi: {
			name: "wordsapi.com",
			link: "https://wordsapi.com",
			notices: {
				licence:
					"You may cache and thus store API Data on your system for up to 24 hours, after which such cached API Data must be purged. Subject to that exception, you will not copy, store, archive, distribute to any third party (other than to End Users as contemplated in this Agreement) any API Data, any metadata or any Link. You agree that any cached API Data will be used by you only for the purpose of populating the Developer Application.",
			},
		},
	},
	software: {
		"@discordeno/bot": apache("Copyright 2021 - 2023 Discordeno"),
		"@sapphire/snowflake": mit("Copyright (c) 2020 The Sapphire Community and its contributors"),
		cheerio: apache("Copyright (c) 2022 The Cheerio contributors"),
		cldpre: apache("Copyright [yyyy] [name of copyright owner]"),
		"csv-parse": mit("Copyright (c) 2010 Adaltas"),
		"dexonline-scraper": mit('Copyright (c) 2023 Dorian "vxern" Oszczęda'),
		dotenv: bsd("Copyright (c) 2015, Scott Motte"),
		"fancy-log": mit(
			"Copyright (c) 2014, 2015, 2018, 2021 Blaine Bublitz <blaine.bublitz@gmail.com> and Eric Schoffstall <yo@contra.io>",
		),
		lavaclient: apache("Copyright 2023 Dimensional Fun & Contributors"),
		"object-hash": mit("Copyright (c) 2014 object-hash contributors"),
		ravendb: mit("Copyright (c) 2017 Hibernating Rhinos LTD"),
		tinyld: mit("Copyright (c) 2021 Komodo"),
		"wiktionary-scraper": mit('Copyright (c) 2023 Dorian "vxern" Oszczęda'),
		"youtube-sr": mit("Copyright (c) 2020 DevAndromeda"),
	},
};

type DictionaryLicence = typeof licences.dictionaries[keyof typeof licences.dictionaries];

export default licences;
export type { DictionaryLicence };
