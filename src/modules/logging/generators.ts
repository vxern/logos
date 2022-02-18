import { ClientEvents, Guild, Member, Message, User } from "../../../deps.ts";
import { bold, code, codeMultiline, mention, MentionType } from "../../formatting.ts";
import configuration from "../../configuration.ts";

interface LogEntry<T extends keyof ClientEvents> {
  title: string;
  message: (...args: ClientEvents[T]) => Promise<string> | string | undefined;
  filter: (origin: Guild, ...args: ClientEvents[T]) => boolean;
  color: number;
}

type Generators = Partial<{
  [key in keyof ClientEvents]: LogEntry<key>;
}>;

const generators: Generators = {
  'guildBanAdd': {
    title: "User banned",
    message: (_, user: User) => `${mentionUser(user)} has been banned.`,
    filter: (origin: Guild, guild: Guild, user: User) => origin.id === guild.id && !user.bot,
    color: configuration.responses.colors.red,
  },
  'guildBanRemove': {
    title: "User unbanned",
    message: (_, user: User) => `${mentionUser(user)} has been unbanned.`,
    filter: (origin: Guild, guild: Guild, user: User) => origin.id === guild.id && !user.bot,
    color: configuration.responses.colors.yellow,
  },
  'guildMemberAdd': {
    title: "User joined",
    message: (member: Member) => `${mentionUser(member.user)} has joined the server.`,
    filter: (origin: Guild, member: Member) => origin.id === member.guild.id && !member.user.bot,
    color: configuration.responses.colors.green,
  },
  'guildMemberRemove': {
    title: "User kicked or left",
    message: (member: Member) => `${mentionUser(member.user)} has left the server, or they have been kicked.`,
    filter: (origin: Guild, member: Member) => origin.id === member.guild.id && !member.user.bot,
    color: configuration.responses.colors.yellow,
  },
  'guildMemberUpdate': {
    title: "User updated",
    message: resolveMemberUpdate,
    filter: (origin: Guild, _, member: Member) => origin.id === member.guild.id && !member.user.bot,
    color: configuration.responses.colors.blue,
  },
  'messageUpdate': {
    title: "Message updated",
    message: (before: Message, after: Message) => `${mentionUser(after.author)} updated their message in ${after.channel}.

${bold("BEFORE")}
${codeMultiline(before.content)}
${bold("AFTER")}
${codeMultiline(after.content)}`,
    filter: (origin: Guild, _, message: Message) => origin.id === message.guild?.id && !message.author.bot,
    color: configuration.responses.colors.blue,
  },
  'messageDelete': {
    title: "Message deleted",
    message: (message: Message) => `${mentionUser(message.author)} deleted their message.

${bold("CONTENT")}
${codeMultiline(message.content)}`,
    filter: (origin: Guild, message: Message) => origin.id === message.guild?.id && !message.author.bot,
    color: configuration.responses.colors.red,
  },
}

const memberUpdates: (before: Member, after: Member) => [boolean, string][] = (before, after) => [
  [before.nick !== after.nick && !before.nick, `${mentionUser(before.user)} has set their nickname to ${code(after.nick!)}.`],
  [before.nick !== after.nick && !!after.nick, `${mentionUser(before.user)} has changed their nickname to ${code(after.nick!)}.`],
  [before.nick !== after.nick && !after.nick, `${mentionUser(before.user)} has removed their nickname.`],
];

function resolveMemberUpdate(before: Member, after: Member): string | undefined {
  for (const [filter, message] of memberUpdates(before, after)) {
    if (filter) {
      return message;
    }
  }

  return undefined;
}

function mentionUser(user: User): string {
  return `${code(user.tag)} ~ ${code(user.id)}`;
}

export default generators;