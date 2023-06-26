import pardon from 'logos/src/commands/moderation/commands/pardon.ts';
import policy from 'logos/src/commands/moderation/commands/policy.ts';
import purge from 'logos/src/commands/moderation/commands/purge.ts';
import report from 'logos/src/commands/moderation/commands/report.ts';
import rule from 'logos/src/commands/moderation/commands/rule.ts';
import timeout from 'logos/src/commands/moderation/commands/timeout.ts';
import warn from 'logos/src/commands/moderation/commands/warn.ts';

export default { local: [pardon, policy, purge, report, rule, timeout, warn], global: [] };
