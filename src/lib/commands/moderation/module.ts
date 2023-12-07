import { Warning } from "../../database/warning";

function getActiveWarnings(warnings: Warning[], expirationMilliseconds: number): Warning[] {
	const now = Date.now();

	return warnings.filter((warning) => now - warning.createdAt < expirationMilliseconds);
}

export { getActiveWarnings };
