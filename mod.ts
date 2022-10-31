import 'dotenv_load';
import { Sentry } from './deps.ts';
import { initialiseClient } from './src/client.ts';

// Array of environment variables required to run the program.
const requiredKeys = [
	'ENVIRONMENT',
	'DISCORD_SECRET',
	'FAUNA_SECRET',
	'DEEPL_SECRET',
	'SENTRY_SECRET',
] as const;
// Array of booleans indicating which environment variables are present at launch.
const presentKeys = requiredKeys.map((key) => !!Deno.env.get(key));

// If at least one environment variable is not present
if (presentKeys.includes(false)) {
	const missingKeys = requiredKeys.filter((_, index) => !presentKeys.at(index)!);
	console.error(
		`Missing one or more required environment variables: ${missingKeys.join(', ')}`,
	);
	Deno.exit(1);
}

Sentry.init({ dsn: Deno.env.get('SENTRY_SECRET'), environment: Deno.env.get('ENVIRONMENT') });

const version = new TextDecoder().decode(
	await Deno.run({
		cmd: ['git', 'tag', '--sort=-committerdate', '--list', 'v*'],
		stdout: 'piped',
	}).output(),
).split('\n').at(0);

initialiseClient(version ?? 'Deno');
