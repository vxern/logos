import { describe, it } from "bun:test";
import { useEnvironment } from "logos:test/dependencies";
import { expect } from "chai";
import { DiscordConnection } from "logos/connection";

const TEST_TIMEOUT = constants.time.second * 10;

describe("DiscordConnection", () => {
	const environment = useEnvironment();

	describe("open()", () => {
		it(
			"opens a gateway connection to Discord.",
			async () => {
				const connection = new DiscordConnection({ environment: environment() });

				expect(() => connection.bot.gateway.editBotStatus({ status: "offline" })).to.throw;

				await connection.open();

				expect(() => connection.bot.gateway.editBotStatus({ status: "offline" })).to.not.throw;
			},
			{ timeout: TEST_TIMEOUT },
		);
	});

	describe("close()", () => {
		it(
			"closes the gateway connection to Discord.",
			async () => {
				const connection = new DiscordConnection({ environment: environment() });
				await connection.open();

				expect(() => connection.bot.gateway.editBotStatus({ status: "offline" })).to.not.throw;

				await connection.close();

				expect(() => connection.bot.gateway.editBotStatus({ status: "offline" })).to.throw;
			},
			{ timeout: TEST_TIMEOUT },
		);
	});
});
