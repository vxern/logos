import 'https://deno.land/x/dotenv@v3.2.0/load.ts';
import { initialiseClient } from './src/client.ts';

// Array of environment variables required to run the program.
const requiredKeys = [
	'DISCORD_SECRET',
	'FAUNA_SECRET',
	'DEEPL_SECRET',
] as const;
// Array of booleans indicating which environment variables are present at launch.
const presentKeys = requiredKeys.map((key) => !!Deno.env.get(key));

// If at least one environment variable is not present
if (presentKeys.includes(false)) {
	const missingKeys = requiredKeys.filter((_, index) =>
		!presentKeys.at(index)!
	);
	console.error(
		`Missing one or more required environment variables: ${
			missingKeys.join(', ')
		}`,
	);
	Deno.exit(1);
}

initialiseClient();
