import { parseArgs } from "node:util";
import bun from "bun";

const log = constants.loggers.feedback;

const { positionals } = parseArgs({
	args: bun.argv,
	allowPositionals: true,
});

const message = positionals
	.slice(2)
	.join("-")
	.replaceAll(/[^a-zA-Z-]/g, "")
	.toLowerCase();
if (message.trim().length === 0) {
	log.error("You must provide a message.");

	process.exit(1);
}

function withLeadingZero(number: number): string {
	if (number > 10) {
		return number.toString();
	}

	return `0${number}`;
}

const date = new Date();
const timestamp = [
	date.getUTCFullYear(),
	withLeadingZero(date.getUTCMonth()),
	withLeadingZero(date.getUTCDate()),
	date.getUTCHours(),
	date.getUTCMinutes(),
	date.getUTCSeconds(),
].join("");
const filename = `${timestamp}_${message}.ts`;
const file = Bun.file(`${constants.directories.migrations}/${filename}`);

if (await file.exists()) {
	log.error(`Migration '${filename}' already exists.`);

	process.exit(1);
}

await Bun.write(
	file,
	`
import type { DatabaseStore } from "logos/stores/database";

// This block is executed when the migration is enacted.
function up(_: DatabaseStore): void {}

// This block is executed when the migration is rolled back.
function down(_: DatabaseStore): void {}

export { up, down };
`.trim(),
);

process.exit(0);