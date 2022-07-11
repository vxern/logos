import { _ } from '../../../../../deps.ts';
import { fromHex } from '../../../../utils.ts';
import { RoleCategory } from '../structures/role-category.ts';
import armenian from './servers/armenian.ts';
import belarusian from './servers/belarusian.ts';
import romanian from './servers/romanian.ts';

const languages: Record<string, Partial<RoleCategory>[]> = {
	armenian,
	belarusian,
	romanian,
};

const base: RoleCategory[] = [
	{
		type: 'CATEGORY',
		name: 'Ethnicities',
		description: 'Roles identifying one\'s ethnicity.',
		color: fromHex('#68d8d6'),
		emoji: '🗾',
		limit: 1,
		collection: {
			type: 'COLLECTION_LOCALISED',
			onAssignMessage: (name) => `Your ethnicity is now ${name}.`,
			onUnassignMessage: (name) => `Your ethnicity is no longer ${name}.`,
			description: (name) => `I am of ${name} heritage.`,
		},
	},
	{
		type: 'CATEGORY',
		name: 'Dialects',
		description:
			'Roles specifying which dialect of the language one is learning.',
		color: fromHex('#00cc66'),
		emoji: '🏷️',
		collection: {
			type: 'COLLECTION_LOCALISED',
			onAssignMessage: (name) => `You are now learning ${name}.`,
			onUnassignMessage: (name) => `You are no longer learning ${name}.`,
			description: (name) => `I am learning ${name}.`,
		},
	},
	{
		type: 'CATEGORY',
		name: 'Regions',
		description: 'Roles specifying which area of the country one is from.',
		color: fromHex('#c5e0d8'),
		emoji: '🤷‍♂️',
		limit: 2,
		collection: {
			type: 'COLLECTION_LOCALISED',
			onAssignMessage: (name) => `You are now from ${name}.`,
			onUnassignMessage: (name) => `You are no longer from ${name}.`,
			description: (name) => `I am from ${name}.`,
		},
	},
];

const local: RoleCategory[] = _.merge(
	base,
	base.map((baseCategory) => ({
		collection: {
			lists: Object.fromEntries(
				Object.entries(languages).map(([language, categories]) => [
					language,
					categories.find((category) => category.name === baseCategory.name)
						?.collection?.list,
				]).filter(([_language, categories]) => categories),
			),
		},
	})),
);

export default local;
