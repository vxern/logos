import { CategoryChannel, Guild, GuildChannels } from '../../../deps.ts';
import { Command } from '../../commands/command.ts';
import compare from './commands/compare.ts';
import post from './commands/post.ts';

const commands: Record<string, Command> = {
	compare,
	post,
};

interface Category {
	category: CategoryChannel;
	channels: GuildChannels[];
}

interface GuildStructure {
	channels: GuildChannels[];
	categories: Category[];
}

async function analyseStructure(
	guild: Guild,
): Promise<GuildStructure> {
	const channels = await guild.channels.array();
	const categoryChannels = channels.filter((channel) =>
		channel.isCategory()
	) as CategoryChannel[];
	return {
		channels: channels.filter((channel) =>
			!(channel.parentID || channel.isCategory())
		),
		categories: categoryChannels.map((
			parentChannel,
		) => {
			return {
				category: parentChannel,
				channels: channels.filter((channel) =>
					channel.parentID === parentChannel.id
				),
			};
		}).sort((a, b) => a.category.position - b.category.position),
	};
}

export type { Category, GuildStructure };
export { analyseStructure };
export default commands;
