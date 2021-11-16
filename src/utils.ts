import {
  _,
  ApplicationCommand,
  ApplicationCommandOption,
  Guild,
  GuildChannel,
  Invite,
} from "../deps.ts";
import { Command } from "./commands/command.ts";
import { Option } from "./commands/option.ts";

/**
 * Makes one or more properties of `T` optional.
 *
 * @typeParam T - The type whose property to make partial.
 * @param K - The property to make partial.
 */
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Compares two command or option objects to determine which keys one or the
 * other is missing.
 *
 * @param left - The Harmony object.
 * @param right - The source object.
 * @returns An array of keys which differ between the objects.
 */
function getMissingKeys(
  left: ApplicationCommand | ApplicationCommandOption,
  right: Command | Option,
): string[];
function getMissingKeys<
  L extends ApplicationCommand | ApplicationCommandOption,
  R extends Partial<L>,
>(
  left: L,
  right: R,
): string[] {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  const keysToIgnore = [
    ...leftKeys.filter((leftKey) => !rightKeys.includes(leftKey)),
    ...rightKeys.filter((rightKey) =>
      !leftKeys.includes(rightKey) && rightKey !== "options"
    ),
  ];

  const unequalKeys = _.reduce(
    right,
    (result: string[], value: unknown, key: keyof L) => {
      return _.isEqual(value, left[key])
        ? result
        : result.concat(key.toString());
    },
    [],
  ) as string[];

  const missingKeys = unequalKeys.filter((unequalKey) =>
    !keysToIgnore.includes(unequalKey)
  );

  return missingKeys;
}

/**
 * Finds a channel within a guild by its name.
 *
 * @param guild - The guild where to find the channel.
 * @param name - The name of the channel.
 * @returns The channel or `undefined` if not found.
 */
async function findChannelByName(
  guild: Guild,
  name: string,
): Promise<GuildChannel | undefined> {
  const channels = await guild.channels.array();
  return channels.find((channel) => channel.name.includes(name));
}

/**
 * Gets the most viable invite link to a guild.
 *
 * @param guild - The guild to which the invite link to find.
 * @returns The invite link.
 */
async function getInvite(guild: Guild): Promise<Invite> {
  const invites = await guild.invites.array();
  return invites.find((invite) =>
    invite.inviter?.id === guild.client.user?.id
  ) ??
    await guild.invites.create(
      (await findChannelByName(guild, "discussion"))!.id,
    );
}

/**
 * Parses a 6-digit hex value prefixed with a hashtag to a number.
 *
 * @param color - The color represented as a 6-digit hexadecimal value prefixed
 * with a hashtag.
 * @returns The decimal form.
 */
function fromHex(color: string): number {
  return parseInt(color.replace("#", "0x"));
}

export { findChannelByName, fromHex, getInvite, getMissingKeys };
export type { Optional };
