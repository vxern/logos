import { Expressions } from 'logos/assets/localisations/expressions.ts';
import { getLocalisationsForLanguage, localise } from 'logos/assets/localisations/utils.ts';
import { code } from 'logos/formatting.ts';
import { getLocaleByLanguage, Language } from 'logos/types.ts';

class Services {
	static readonly entry = {
		selectProficiency: {
			header: {
				'English': 'Language Proficiency',
				'Polish': 'Biegłość Języczna',
				'Romanian': 'Competență Lingvistică',
			},
			body: {
				'English': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('English'));

					return `Select the role that most accurately describes your ${languageLocalised} language proficiency.\n\n` +
						`ℹ️ **You can always change this later using the ${code('/profile roles')} command.**`;
				},
				'Polish': (language: Language) => {
					const languageLocalised = Expressions.polish.cases.instrumental.languages[language];

					return `Wybierz rolę, która najlepiej przedstawia Twoją biegłość w języku ${languageLocalised}.\n\n` +
						`ℹ️ **Pamiętaj, że możesz ją później zmienić używając komendy ${code('/profile roles')}.**`;
				},
				'Romanian': (language: Language) => {
					const languageLocalised = localise(getLocalisationsForLanguage(language), getLocaleByLanguage('Romanian'))
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
			'Polish': 'Ze względu na bezpieczeństwo, zbyt nowe konta nie mogą dołączyć do serwera.',
			'Romanian': 'Din motive de securitate, conturile care sunt prea noi nu pot intra pe server.',
		},
		needsVerification: {
			'English': (guildName: string) =>
				`Before you can enter ${guildName}, you must first verify yourself by answering a set of verification questions.\n\n` +
				'Please answer them honestly as rejections are permanent, and you won\'t be able to submit a new set of answers.',
			'Polish': (_guildName: string) =>
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
				'Polish': 'Odpowiedzi wysłane!',
				'Romanian': 'Răspunsuri transmise!',
			},
			body: {
				'English': 'Your answers to the verification questions have been submitted.\n\n' +
					'Your request to join the server will be reviewed by the server staff, and you will be notified via DMs when your entry request is accepted.',
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
			'Polish': 'Nie udało się przesłać odpowiedzi na pytania weryfikacyjne.',
			'Romanian': 'Nu am reușit să transmitem răspunsurile tale la întrebări.',
		},
		acceptedDirect: {
			'English': (guildName: string) =>
				`Your request to join ${guildName} has been accepted.\n\n` +
				'Thank you for the wait.',
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
				'Polish': 'Nie udało się zarejestrować głosu.',
				'Romanian': 'Nu am reușit să înregistrăm votul.',
			},
			failedToUpdateVerificationState: {
				'English': 'Failed to update verification state.',
				'Polish': 'Nie udało się zaktualizować stanu weryfikacji.',
				'Romanian': 'Nu am reușit să actualizăm starea de verificare.',
			},
			alreadyVotedToAccept: {
				'English': 'You have already voted in favour of this user\'s entry request being accepted.',
				'Polish': 'Już wcześniej głosowałeś na rzecz akceptacji prośby użytkownika o dołączenie do serwera.',
				'Romanian': 'Ai votat deja în favoarea acceptării cererii utilizatorului de a se alătura serverului.',
			},
			alreadyVotedToReject: {
				'English': 'You have already voted against this user\'s entry request being accepted.',
				'Polish': 'Już wcześniej głosowałeś przeciwko akceptacji prośby użytkownika o dołączenie do serwera.',
				'Romanian': 'Ai votat deja împotriva cererii utilizatorului de a se alătura serverului.',
			},
			stanceOnVoteChanged: {
				'English': 'Your stance in this vote has been changed.',
				'Polish': 'Zmieniono twoją pozycję w głosowaniu.',
				'Romanian': 'S-a schimbat poziția ta în acest vot.',
			},
		},
	};
}

export { Services };
