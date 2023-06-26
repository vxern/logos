import pardon from 'logos/src/lib/commands/moderation/commands/pardon.ts';
import policy from 'logos/src/lib/commands/moderation/commands/policy.ts';
import purge from 'logos/src/lib/commands/moderation/commands/purge.ts';
import report from 'logos/src/lib/commands/moderation/commands/report.ts';
import rule from 'logos/src/lib/commands/moderation/commands/rule.ts';
import timeout from 'logos/src/lib/commands/moderation/commands/timeout.ts';
import warn from 'logos/src/lib/commands/moderation/commands/warn.ts';

export default { local: [pardon, policy, purge, report, rule, timeout, warn], global: [] };
