import { fromHex } from '../../../../utils.ts';
import {
	RoleCategory,
	RoleCategoryTypes,
} from '../structures/role-category.ts';
import { RoleCollectionTypes } from '../structures/role-collection.ts';

const categories: RoleCategory[] = [
	{
		name: 'Proficiency',
		description:
			'Roles representing the user\'s language proficiency and knowledge of the language.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#1c1c1c'),
		emoji: '🎓',
		isSingle: true,
		collection: {
			type: RoleCollectionTypes.Collection,
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
		name: 'Personalisation',
		description: 'Roles used to personalise one\'s server profile.',
		color: fromHex('#ffe548'),
		emoji: '🌈',
		type: RoleCategoryTypes.CategoryGroup,
		categories: [
			{
				name: 'Gender',
				description: 'Roles defining one\'s gender.',
				type: RoleCategoryTypes.Category,
				color: fromHex('#ff4b3e'),
				emoji: '⚧',
				isSingle: true,
				collection: {
					type: RoleCollectionTypes.Collection,
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
				name: 'Abroad',
				description: 'Roles related to the abroad.',
				type: RoleCategoryTypes.Category,
				color: fromHex('#d6e3f8'),
				emoji: '🌎',
				isSingle: false,
				collection: {
					type: RoleCollectionTypes.Collection,
					onAssignMessage: (name) => `You are now a ${name}.`,
					onUnassignMessage: (name) => `You are no longer a ${name}.`,
					list: [{
						name: 'Diasporan',
						description:
							'I am a native, or a child of natives, who has been brought up abroad.',
						emoji: '🌎',
					}],
				},
			},
		],
	},
	{
		name: 'Learning',
		description: 'Roles applied in teaching and learning the language.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#daddd8'),
		emoji: '📖',
		isSingle: false,
		collection: {
			type: RoleCollectionTypes.Collection,
			list: [{
				name: 'Classroom Attendee',
				description:
					'I attend sessions in the classroom channel and would like to be notified when a session takes place.',
				onAssignMessage: (_) =>
					`You will now be notified of each lesson before it begins.`,
				onUnassignMessage: (_) =>
					`You will no longer be notified before each lesson.`,
				emoji: '📖',
			}, {
				name: 'Correct Me',
				description:
					`"I think, therefore I make mistakes." - Please do correct me.`,
				onAssignMessage: (_) =>
					`Other users will now be able to see that you demand additional corrections.`,
				onUnassignMessage: (_) =>
					`Other users will no longer be able to see that you demand additional corrections.`,
				emoji: '✍️',
			}, {
				name: 'Daily Phrase',
				description: 'I want to be notified when a new daily phrase is posted.',
				onAssignMessage: (_) =>
					`You will now be notified when a daily phrase is posted.`,
				onUnassignMessage: (_) =>
					'You will no longer be notified of new daily phrases.',
				emoji: '🌞',
			}, {
				name: 'Voicechatter',
				description:
					'I enjoy attending (un)announced VC sessions and speaking with other people.',
				onAssignMessage: (_) => `You can now be notified of a VC session.`,
				onUnassignMessage: (_) =>
					'You will no longer be notified of VC sessions.',
				emoji: '🗣️',
			}],
		},
	},
];

export default categories;
