import configuration from '../../../configuration.ts';
import { fromHex } from '../../../utils.ts';
import { fromNames } from '../module.ts';
import { Role } from './structures/role.ts';
import { RoleCategory, RoleCategoryTypes } from './structures/role-category.ts';
import { RoleCollectionTypes } from './structures/role-collection.ts';

const categories: RoleCategory[] = [
	{
		name: 'Proficiency',
		description:
			'Roles representing the user\'s language proficiency and knowledge of the language.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#1c1c1c'),
		emoji: '🎓',
		restrictToOneRole: true,
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
				restrictToOneRole: true,
				collection: {
					type: RoleCollectionTypes.Collection,
					generateDescription: (name) =>
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
				restrictToOneRole: false,
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
		restrictToOneRole: false,
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
	{
		name: 'Ethnicities',
		description: 'Roles identifying one\'s ethnicity.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#68d8d6'),
		emoji: '🗾',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `Your ethnicity is now ${name}.`,
			onUnassignMessage: (name) => `Your ethnicity is no longer ${name}.`,
			generateDescription: (name) => `I am of ${name} heritage.`,
			lists: {
				'Armenian': fromNames([
					'Armeno-Tat',
					'Circassian',
					'Hemshen',
					'Hidden',
				]),
				'Romanian': fromNames([
					'Aromanian',
					'Istro-Romanian',
					'Megleno-Romanian',
				]),
			},
		},
	},
	{
		name: 'Dialects',
		description:
			'Roles specifying which dialect of the language one is learning.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#00cc66'),
		emoji: '🏷️',
		restrictToOneRole: false,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `You are now learning ${name}.`,
			onUnassignMessage: (name) => `You are no longer learning ${name}.`,
			generateDescription: (name) => `I am learning ${name}.`,
			lists: {
				'Armenian': fromNames(
					configuration.guilds.languages['Armenian'].dialects,
				),
			},
		},
	},
	{
		name: 'Regions',
		description: 'Roles specifying which area of the country one is from.',
		type: RoleCategoryTypes.Category,
		color: fromHex('#c5e0d8'),
		emoji: '🤷‍♂️',
		restrictToOneRole: false,
		limit: 2,
		collection: {
			type: RoleCollectionTypes.CollectionLocalised,
			onAssignMessage: (name) => `You are now from ${name}.`,
			onUnassignMessage: (name) => `You are no longer from ${name}.`,
			generateDescription: (name) => `I am from ${name}.`,
			lists: {
				'Armenian': fromNames([
					'Aragats\'otn / Արագածոտն',
					'Ararat / Արարատ',
					'Armavir / Արմավիր',
					'Geghark\'unik\' / Գեղարքունիք',
					'Kotayk\' / Կոտայք',
					'Lorri / Լոռի',
					'Shirak / Շիրակ',
					'Syunik\' / Սյունիք',
					'Tavush / Տավուշ',
					'Vayots\' Dzor / Վայոց Ձոր',
					'Yerevan / Երևան',
				]),
				'Belarusian': fromNames([
					'Brest / Брэсцкая',
					'Hrodna / Гродзенская',
					'Homel / Гомельская',
					'Mahilyow / Магілёўская',
					'Minsk / Мінская',
					'Vitsebsk / Вiцебская',
				]),
				'Romanian': fromNames([
					'Banat',
					'Basarabia',
					'Bucovina',
					'Crișana',
					'Dobrogea',
					'Maramureș',
					'Moldova',
					'Muntenia',
					'Oltenia',
					'Transilvania',
				]),
			},
		},
	},
];

/**
 * Taking an array of categories with partial information filled in, completes
 * the necessary information, and returns the complete role categories.
 *
 * @param roleCategories - The incomplete role categories.
 * @returns The completed categories.
 */
function supplyMissingProperties(
	roleCategories: RoleCategory[],
): RoleCategory[] {
	for (const category of roleCategories) {
		if (category.type === RoleCategoryTypes.CategoryGroup) {
			supplyMissingProperties(category.categories);
			continue;
		}

		const collection = category.collection;

		const roleLists =
			collection.type === RoleCollectionTypes.CollectionLocalised
				? Object.values<Role[]>(collection.lists)
				: [collection.list];

		for (const roleList of roleLists) {
			for (const role of roleList) {
				role.description ??= collection.generateDescription!(role.name);
				role.onAssignMessage ??= collection.onAssignMessage;
				if ('onUnassignMessage' in collection) {
					role.onUnassignMessage = collection.onUnassignMessage;
				}
			}
		}
	}

	return roleCategories;
}

const categoriesComplete = supplyMissingProperties(categories);

export default categoriesComplete;
