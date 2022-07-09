import { fromHex } from '../../../../utils.ts';
import { RoleCategory } from '../structures/role-category.ts';

const base: RoleCategory[] = [
	{
		type: 'CATEGORY',
		name: 'Proficiency',
		description:
			'Roles representing the user\'s language proficiency and knowledge of the language.',
		color: fromHex('#1c1c1c'),
		emoji: '🎓',
		limit: 1,
		collection: {
			type: 'COLLECTION',
			onAssignMessage: (name) =>
				`Your language proficiency is now ${name.toLowerCase()}.`,
			list: [{
				name: 'Beginner',
				description:
					'I am just beginning to learn; I have limited understanding and I know a couple basic phrases.',
				emoji: '🟩',
			}, {
				name: 'Intermediate',
				description:
					'I have been learning for a while; I have decent understanding and I can sustain a conversation.',
				emoji: '🟦',
			}, {
				name: 'Advanced',
				description:
					'I have been learning for a long time; I have firm understanding and I can speak without much effort.',
				emoji: '🟥',
			}, {
				name: 'Native',
				description:
					'I was brought up speaking the language; I understand and I can speak about everything with ease.',
				emoji: '🟨',
			}],
		},
	},
	{
		type: 'CATEGORY_GROUP',
		name: 'Personalisation',
		description: 'Roles used to personalise one\'s server profile.',
		color: fromHex('#ffe548'),
		emoji: '🌈',
		categories: [
			{
				type: 'CATEGORY',
				name: 'Gender',
				description: 'Roles defining one\'s gender.',
				color: fromHex('#ff4b3e'),
				emoji: '⚧',
				limit: 1,
				collection: {
					type: 'COLLECTION',
					description: (name) =>
						`I am of the ${name.toLowerCase()} persuasion.`,
					onAssignMessage: (name) =>
						`You now identify as a ${name.toLowerCase()}.`,
					list: [{
						name: 'Male',
						emoji: '♂️',
					}, {
						name: 'Female',
						emoji: '♀️',
					}, {
						name: 'Transgender',
						emoji: '⚧',
					}, {
						name: 'Non-binary',
						emoji: '❔',
					}],
				},
			},
			{
				type: 'CATEGORY',
				name: 'Abroad',
				description: 'Roles related to the abroad.',
				color: fromHex('#d6e3f8'),
				emoji: '🌎',
				limit: -1,
				collection: {
					type: 'COLLECTION',
					onAssignMessage: (name) => `You are now a ${name}.`,
					onUnassignMessage: (name) => `You are no longer a ${name}.`,
					list: [{
						name: 'Diasporan',
						description:
							'I am a native, or a child of natives, who had been brought up abroad.',
						emoji: '🌎',
					}, {
						name: 'Emigrant',
						description:
							'I emigrated from my country of origin to live and/or work abroad.',
						emoji: '💼',
					}],
				},
			},
		],
	},
	{
		type: 'CATEGORY',
		name: 'Learning',
		description: 'Roles applied in teaching and learning the language.',
		color: fromHex('#daddd8'),
		emoji: '📖',
		limit: -1,
		collection: {
			type: 'COLLECTION',
			list: [{
				name: 'Classroom Attendee',
				onAssignMessage: (_) =>
					`You will now be notified of each lesson before it begins.`,
				onUnassignMessage: (_) =>
					`You will no longer be notified before each lesson.`,
				description:
					'I attend sessions in the classroom channel and would like to be notified when a session takes place.',
				emoji: '📖',
			}, {
				name: 'Correct Me',
				onAssignMessage: (_) =>
					`Other users will now be able to see that you demand additional corrections.`,
				onUnassignMessage: (_) =>
					`Other users will no longer be able to see that you demand additional corrections.`,
				description:
					`"I think, therefore I make mistakes." - Please do correct me.`,
				emoji: '✍️',
			}, {
				name: 'Daily Phrase',
				onAssignMessage: (_) =>
					`You will now be notified when a daily phrase is posted.`,
				onUnassignMessage: (_) =>
					'You will no longer be notified of new daily phrases.',
				description: 'I want to be notified when a new daily phrase is posted.',
				emoji: '🌞',
			}, {
				name: 'Voicechatter',
				onAssignMessage: (_) => `You can now be notified of a VC session.`,
				onUnassignMessage: (_) =>
					'You will no longer be notified of VC sessions.',
				description:
					'I enjoy attending (un)announced VC sessions and speaking with other people.',
				emoji: '🗣️',
			}],
		},
	},
];

export default base;
