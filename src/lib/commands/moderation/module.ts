import { Warning } from "../../database/warning";

// TODO(vxern): Find better place for this. Likely the warning model.
function getActiveWarnings(warnings: Warning[], expirationMilliseconds: number): Warning[] {
	const now = Date.now();

	return warnings.filter((warning) => now - warning.createdAt < expirationMilliseconds);
}

export { getActiveWarnings };
