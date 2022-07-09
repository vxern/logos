import {
	CategoryChannel,
	Client,
	colors,
	Embed,
	Guild,
	GuildChannels,
	Interaction,
} from '../../../../../../deps.ts';
import secrets from '../../../../../../secrets.ts';
import { codeMultiline } from '../../../../../formatting.ts';

/** Represents the channel structure */
interface ChannelStructure {
	/** The top-level guild channels. */
	channels: GuildChannels[];

	/** The guild channel categories. */
	categories: ChannelCategory[];
}

/** Represents a channel category. */
interface ChannelCategory {
	/** The top-level category channel. */
	category: CategoryChannel;

	/** The channels within this channel category. */
	channels: GuildChannels[];
}

/** Compares channel structures of guilds. */
async function compareGuildChannelStructures(
	_client: Client,
	interaction: Interaction,
): Promise<void> {
	const source = (await interaction.client.guilds.get(
		secrets.modules.secret.template.guild.id,
	))!;
	const target = interaction.guild!;

	console.log(
		colors.yellow(
			`Analysing structural differences between template guild and ${
				colors.bold(target.name!)
			} as per ${colors.bold(interaction.user.username)}'s request...'`,
		),
	);
	const comparison = await analyseStructuralDifferences({
		source: source,
		target: target,
	});

	const embed = new Embed();
	embed.title = (comparison.categories.length === 0 &&
			comparison.channels.length === 0)
		? 'Structure match'
		: 'Missing channels';
	if (comparison.channels.length !== 0) {
		embed.description = codeMultiline(
			comparison.channels.map((channel) => channel.name).join('\n'),
		);
	} else if (comparison.categories.length === 0) {
		embed.description = `The server structure of ${target
			.name!} matches that of the template guild.`;
	}

	if (comparison.categories.length !== 0) {
		embed.setFields(comparison.categories.map((category) => ({
			name: category.category.name,
			value: codeMultiline(
				category.channels.map((channel) => channel.name)
					.join(
						'\n',
					),
			),
		})));
	}

	interaction.respond({
		embeds: [embed],
		ephemeral: true,
	});
}

/** Taking a guild, returns its channel structure. */
async function getGuildStructure(guild: Guild): Promise<ChannelStructure> {
	const channels = await guild.channels.array();
	const topLevelChannels = channels.filter((channel) =>
		!channel.parentID && !channel.isCategory()
	);

	const categoryChannels = <CategoryChannel[]> channels.filter((channel) =>
		channel.isCategory()
	);
	const channelCategories = categoryChannels.map((
		parentChannel,
	) => ({
		category: parentChannel,
		channels: channels.filter((channel) =>
			channel.parentID === parentChannel.id
		),
	})).sort((a, b) => a.category.position - b.category.position);

	return {
		channels: topLevelChannels,
		categories: channelCategories,
	};
}

/**
 * Taking two guilds, 'source' and 'target', analyses the differences in their
 * channel structures.
 */
async function analyseStructuralDifferences(
	{ source, target }: { source: Guild; target: Guild },
): Promise<ChannelStructure> {
	const sourceStructure = await getGuildStructure(source);
	const targetStructure = await getGuildStructure(target);

	const missingChannels = sourceStructure.channels.filter((sourceChannel) =>
		!targetStructure.channels.some((targetChannel) =>
			targetChannel.name === sourceChannel.name
		)
	);
	const missingCategories = sourceStructure.categories.filter((
		sourceCategory,
	) => {
		const targetCategory = targetStructure.categories.find((targetCategory) =>
			targetCategory.category.name === sourceCategory.category.name
		);
		if (!targetCategory) return true;

		sourceCategory.channels = sourceCategory.channels.filter((sourceChannel) =>
			!targetCategory.channels.some((targetChannel) =>
				targetChannel.name === sourceChannel.name
			)
		);
		if (sourceCategory.channels.length === 0) return false;

		return true;
	});

	return {
		channels: missingChannels,
		categories: missingCategories,
	};
}

export { compareGuildChannelStructures };
