import pardon from 'logos/src/commands/moderation/commands/pardon.ts';
import policy from 'logos/src/commands/moderation/commands/policy.ts';
import report from 'logos/src/commands/moderation/commands/report.ts';
import rule from 'logos/src/commands/moderation/commands/rule.ts';
import timeout from 'logos/src/commands/moderation/commands/timeout.ts';
import warn from 'logos/src/commands/moderation/commands/warn.ts';

const commands = [rule, pardon, timeout, report, warn, policy];

export default commands;
