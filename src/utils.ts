import {
	_,
	ButtonStyle,
	Collector,
	colors,
	EmbedField,
	EmbedPayload,
	Guild,
	GuildTextChannel,
	Interaction,
	InteractionResponseModal,
	InteractionResponseType,
	InteractionType,
	Member,
	Message,
	MessageComponentData,
	MessageComponentInteraction,
	MessageComponentType,
	Snowflake,
	TextInputStyle,
	User,
} from '../deps.ts';
import { code } from './formatting.ts';
import { Client } from './client.ts';
import configuration from './configuration.ts';

/**
 * Parses a 6-digit hex value prefixed with a hashtag to a number.
 *
 * @param color - The color represented as a 6-digit hexadecimal value prefixed
 * with a hashtag.
 * @returns The decimal form.
 */
function fromHex(color: string): number {
	return parseInt(color.replace('#', '0x'));
}

/**
 * Taking a guild and the name of a channel, finds the channel with that name
 * and returns it.
 *
 * @param guild - The guild whose channels to look through.
 * @param name - The name of the channel to find.
 * @returns The found channel.
 */
async function getTextChannel(
	guild: Guild,
	name: string,
): Promise<GuildTextChannel | undefined> {
	const channels = await guild.channels.array().catch(() => undefined);
	if (!channels) {
		console.error(
			`Failed to fetch channels for guild ${colors.bold(guild.name!)}.`,
		);
		return undefined;
	}

	const nameAsLowercase = name.toLowerCase();

	return channels.find((channel) =>
		channel.isGuildText() &&
		!channel.isThread() &&
		channel.name.toLowerCase().includes(nameAsLowercase)
	) as
		| GuildTextChannel
		| undefined;
}

/**
 * Taking a user object, creates an informational mention for the user.
 *
 * @param user - The user object.
 * @returns The mention.
 */
function mentionUser(user: User, plain?: boolean): string {
	if (plain) return `${user.tag} (${user.id})`;

	return `${code(user.tag)} (${code(user.id)})`;
}

/** Represents an interactable form. */
interface Form {
	/** The title of a form. */
	title: string;

	/** The text fields defined within the form. */
	fields: {
		[key: string]: {
			/** The label on a particular text field. */
			label: string | ((language: string) => string);

			/** The 'style' of this text field. */
			style: TextInputStyle;

			/**
			 * The minimum number of characters required to be inputted into this
			 * text field.
			 */
			minimum: number;

			/** Whether this text field is required to be filled or not. */
			required?: boolean;

			/** The filled content of this text field. */
			value?: string;

			/**
			 * The maximum number of characters allowed to be inputted into this
			 * text field.
			 */
			maximum: number;
		};
	};
}

/**
 * Taking a form object, converts it to a modal.
 *
 * @param form - The form to convert.
 * @param customID - The custom ID of the modal.
 * @param language - (Optional) The language of the guild the modal is being created for.
 * @returns The form converted into a modal.
 */
function toModal(
	form: Form,
	customID: string,
	language?: string,
): InteractionResponseModal {
	const components = Object.entries(form.fields).map<MessageComponentData>(
		([name, field]) => ({
			type: MessageComponentType.ACTION_ROW,
			components: [
				{
					type: MessageComponentType.TEXT_INPUT,
					customID: `${customID}|${name}`,
					label: typeof field.label === 'function'
						? field.label(language!)
						: field.label,
					style: field.style,
					value: field.value,
					required: field.required,
					minLength: field.minimum === 0 ? undefined : field.minimum,
					maxLength: field.maximum,
				},
			],
		}),
	);

	return {
		title: form.title,
		customID: customID,
		components: components,
	};
}

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
async function paginate<T>(
	{
		interaction,
		elements,
		embed,
		view,
		show,
	}: {
		interaction: Interaction;
		elements: T[];
		embed: Omit<EmbedPayload, 'fields' | 'footer'>;
		view: {
			title: string;
			generate: (element: T, index: number) => string;
		};
		show: boolean;
	},
): Promise<void> {
	let index = 0;

	const isFirst = () => index === 0;
	const isLast = () => index === elements.length - 1;

	function generateEmbed(): EmbedPayload {
		const field = view.generate(elements[index]!, index);

		return {
			...embed,
			fields: [{
				name: elements.length === 1
					? view.title
					: `${view.title} ~ Page ${index + 1}/${elements.length}`,
				value: field,
			}],
			footer: isLast() ? undefined : { text: 'Continued on the next page...' },
		};
	}

	function generateButtons(): MessageComponentData[] {
		const buttons: MessageComponentData[] = [];

		if (!isFirst()) {
			buttons.push({
				type: MessageComponentType.BUTTON,
				customID: 'ARTICLE|PREVIOUS',
				style: ButtonStyle.GREY,
				label: '«',
			});
		}

		if (!isLast()) {
			buttons.push({
				type: MessageComponentType.BUTTON,
				customID: 'ARTICLE|NEXT',
				style: ButtonStyle.GREY,
				label: '»',
			});
		}

		return buttons.length === 0 ? [] : [{
			type: MessageComponentType.ACTION_ROW,
			components: buttons,
		}];
	}

	const response = await interaction.respond({
		embeds: [generateEmbed()],
		components: generateButtons(),
		ephemeral: !show,
	});
	const message = await response.fetchResponse();

	const collector = new Collector({
		event: 'interactionCreate',
		client: interaction.client,
		filter: (selection: Interaction) => {
			if (!selection.isMessageComponent()) return false;

			if (selection.message.id !== message.id) return false;

			if (selection.user.id !== interaction.user.id) return false;

			if (!selection.customID.startsWith('ARTICLE')) return false;

			return true;
		},
		deinitOnEnd: true,
	});

	collector.on('collect', (selection: MessageComponentInteraction) => {
		const action = selection.customID.split('|')[1]!;

		switch (action) {
			case 'PREVIOUS':
				if (!isFirst()) index--;
				break;
			case 'NEXT':
				if (!isLast()) index++;
				break;
		}

		selection.respond({
			type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
		});

		interaction.editResponse({
			embeds: [generateEmbed()],
			components: generateButtons(),
		});
	});

	collector.collect();
}

type ConditionChecker = (interaction: Interaction) => boolean;

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: InteractionType;

	/** The accepted respondent to the collector. `undefined` signifies any user. */
	user?: User;

	/** The ID of the interaction to listen for. */
	customID?: string;

	/** Whether this collector is to last forever or not. */
	endless?: boolean;

	/** How many interactions to collect before de-initialising. */
	limit?: number;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	client: Client,
	settings: InteractionCollectorSettings,
): [collector: Collector, customID: string, isEnded: () => boolean] {
	const customID = settings.customID ?? Snowflake.generate();

	const conditionsUnfiltered: (ConditionChecker | undefined)[] = [
		(interaction) => interaction.type === settings.type,
		(interaction) =>
			!!interaction.data && 'custom_id' in interaction.data &&
			(!interaction.data.custom_id.includes('|')
					? interaction.data.custom_id
					: interaction.data.custom_id.split('|')[0]) ===
				(!customID.includes('|') ? customID : customID.split('|')[0]),
		!settings.user
			? undefined
			: (interaction) => interaction.user.id === settings.user!.id,
	];

	const conditions = <ConditionChecker[]> conditionsUnfiltered.filter((
		condition,
	) => condition);

	const condition = (interaction: Interaction) =>
		conditions.every((condition) => condition(interaction));

	const collector = new Collector<Interaction[]>({
		event: 'interactionCreate',
		client: client,
		filter: condition,
		max: settings.limit ?? undefined,
		deinitOnEnd: true,
		timeout: settings.endless
			? undefined
			: configuration.core.collectors.maxima.timeout,
	});

	let isEnded = false;
	collector.on('end', () => {
		isEnded = true;
	});

	collector.collect();

	return [collector, customID, () => isEnded];
}

/** Creates a verification prompt in the verifications channel. */
async function createVerificationPrompt(
	client: Client,
	guild: Guild,
	settings: { title: string; fields: EmbedField[] },
): Promise<[boolean, Member]> {
	const verificationChannel = (await getTextChannel(
		guild,
		configuration.guilds.channels.verification,
	))!;

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MESSAGE_COMPONENT,
		endless: true,
		limit: 1,
	});

	const verificationMessage = await verificationChannel.send({
		embeds: [{
			title: settings.title,
			fields: settings.fields,
		}],
		components: [{
			type: MessageComponentType.ACTION_ROW,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREEN,
				label: 'Accept',
				customID: `${customID}|true`,
			}, {
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.RED,
				label: 'Reject',
				customID: `${customID}|false`,
			}],
		}],
	});

	const selection =
		<MessageComponentInteraction> (await collector.waitFor('collect'))[0];

	const accepted = selection.data.custom_id.split('|')[1]! === 'true';

	verificationMessage.delete();

	return [accepted, selection.member!];
}

/** Creates a DM with the given user. */
function messageUser(
	user: User,
	guild: Guild,
	embed: Omit<EmbedPayload, 'thumbnail' | 'footer'>,
	components?: MessageComponentData[],
): Promise<Message> {
	const guildName = guild!.name!;

	return user.send({
		embeds: [{
			thumbnail: { url: guild!.iconURL(undefined, 64) },
			...embed,
			footer: {
				text: `This message originated from ${guildName}.`,
			},
		}],
		components: components,
	});
}

/**
 * Taking an array, splits it into parts of equal sizes.
 *
 * @param array - The array to chunk.
 * @param size - The size of each chunk.
 * @returns The chunked array.
 */
function chunk<T>(array: T[], size: number): T[][] {
	if (array.length === 0) return [[]];

	const chunks = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

/**
 * Taking a string, trims it to the desired length and returns it.
 *
 * @param string - The string to trim.
 * @param length - The desired length.
 * @returns The trimmed string.
 */
function trim(string: string, length: number): string {
	return string.length <= length
		? string
		: `${string.slice(0, Math.max(length - 3, 0))}...`;
}

/** The maximum number of members that can be fetched at any one time. */
const maximumMembersPerFetch = 1000;

/**
 * Fetches the complete list of guild members.
 *
 * @param guild - The guild to fetch the members for.
 * @return The members of the guild.
 */
async function fetchGuildMembers(guild: Guild): Promise<Member[]> {
	const memberList: Member[] = [];

	let fetchedMembersNumber = -1;
	while (
		fetchedMembersNumber === -1 ||
		fetchedMembersNumber === maximumMembersPerFetch
	) {
		const last = memberList.length === 0
			? undefined
			: memberList[memberList.length - 1];
		// deno-lint-ignore no-await-in-loop
		const fetchedMembers = await guild.members.fetchList(
			maximumMembersPerFetch,
			last?.id,
		);
		fetchedMembersNumber = fetchedMembers.length;
		memberList.push(...fetchedMembers);
	}

	return memberList;
}

/**
 * Generates a pseudo-random number.
 *
 * @param max - The maximum value to generate.
 * @returns A pseudo-random number between 0 and {@link max}.
 */
function random(max: number): number {
	return Math.floor(Math.random() * max);
}

export {
	chunk,
	createInteractionCollector,
	createVerificationPrompt,
	fetchGuildMembers,
	fromHex,
	getTextChannel,
	mentionUser,
	messageUser,
	paginate,
	random,
	toModal,
	trim,
};
export type { Form };
