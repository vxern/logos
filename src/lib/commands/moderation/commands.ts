import pardon from "./commands/pardon.js";
import policy from "./commands/policy.js";
import purge from "./commands/purge.js";
import report from "./commands/report.js";
import rule from "./commands/rule.js";
import timeout from "./commands/timeout.js";
import warn from "./commands/warn.js";

export default { local: [pardon, policy, purge, report, rule, timeout, warn], global: [] };
