import { GuildChannel, Role, User } from "../deps.ts";

/**
 * Modifies a string of text to appear bold within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function bold(target: string): string {
  return `**${target}**`;
}

/**
 * Modifies a string of text to appear within Discord as an embedded code block.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function code(target: string): string {
  return "`" + target + "`";
}

/**
 * Modifies a string of text to appear within Discord as a multi-line code block
 * which expands to fill up entire rows and columns within a text box.
 *
 * @param target - String of text to format.
 */
function codeMultiline(target: string): string {
  return "```" + target + "```";
}

/**
 * Modifies a string of text to appear italicised within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function italic(target: string): string {
  return `*${target}*`;
}

/**
 * Modifies a string of text to appear underlined within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function underlined(target: string): string {
  return `__${target}__`;
}

function mention(user: User): string;
function mention(channel: GuildChannel): string;
function mention(role: Role): string;
function mention(target: any): string {
  let prefix: string = "";
  if (target instanceof User) {
    prefix = "@";
  } else if (target instanceof MessageChannel) {
    prefix = "#";
  } else if (target instanceof Role) {
    prefix = "@&";
  }
  return `<${prefix}${target.id}>`;
}

export { bold, code, codeMultiline, italic, mention, underlined };
