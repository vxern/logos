import rule from 'logos/src/commands/moderation/commands/rule.ts';
import pardon from 'logos/src/commands/moderation/commands/pardon.ts';
import policy from 'logos/src/commands/moderation/commands/policy.ts';
import timeout from 'logos/src/commands/moderation/commands/timeout.ts';
import warn from 'logos/src/commands/moderation/commands/warn.ts';

const commands = [rule, pardon, timeout, warn, policy];

export default commands;
