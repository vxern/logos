import { capitalise, code, codeMultiline, decapitalise, list, mention, timestamp, trim } from "../src/formatting";

describe("capitalise()", () => {
	it("turns the first letter of the passed string uppercase.", () => {
		expect(capitalise("hello world!")).toBe("Hello world!");
	});

	it("returns an empty string when an empty string is inputted.", () => {
		expect(capitalise("")).toBe("");
	});
});

describe("decapitalise()", () => {
	it("turns the first letter of the passed string lowercase.", () => {
		expect(decapitalise("Hello world!")).toBe("hello world!");
	});

	it("returns an empty string when an empty string is inputted.", () => {
		expect(decapitalise("")).toBe("");
	});
});

describe("code()", () => {
	it("wraps the passed string in a markdown code block.", () => {
		expect(code("this-is-a-sample-string")).toBe("`this-is-a-sample-string`");
	});

	it("returns an empty string when an empty string is inputted.", () => {
		expect(code("")).toBe("");
	});
});

describe("codeMultiline()", () => {
	it("wraps the passed string in a markdown multi-line code block.", () => {
		expect(codeMultiline("public static void main(String[] args) {}")).toBe(
			"```public static void main(String[] args) {}```",
		);
	});

	it("returns an empty string when an empty string is inputted.", () => {
		expect(codeMultiline("")).toBe("");
	});
});

describe("list()", () => {
	it("formats the passed array of strings as a markdown list.", () => {
		expect(list(["one", "two", "three", "four"])).toBe("- one\n- two\n- three\n- four");
	});

	it("returns an empty string when an empty array is inputted.", () => {
		expect(list([])).toBe("");
	});
});

describe("timestamp()", () => {
	describe("formats the passed Unix timestamp", () => {
		it("in short time format.", () => {
			expect(timestamp(7031, { format: "short-time" })).toBe("<t:7031:t>");
		});

		it("in long time format.", () => {
			expect(timestamp(7031, { format: "long-time" })).toBe("<t:7031:T>");
		});

		it("in short date format.", () => {
			expect(timestamp(7031, { format: "short-date" })).toBe("<t:7031:d>");
		});

		it("in long date format.", () => {
			expect(timestamp(7031, { format: "long-date" })).toBe("<t:7031:D>");
		});

		it("in short date-time format.", () => {
			expect(timestamp(7031, { format: "short-datetime" })).toBe("<t:7031:f>");
		});

		it("in long date-time format.", () => {
			expect(timestamp(7031, { format: "long-datetime" })).toBe("<t:7031:F>");
		});

		it("in relative format.", () => {
			expect(timestamp(7031, { format: "relative" })).toBe("<t:7031:R>");
		});
	});
});

describe("mention()", () => {
	describe("formats the passed ID", () => {
		it("as a channel mention.", () => {
			expect(mention(7031n, { type: "channel" })).toBe("<#7031>");
		});

		it("as a role mention.", () => {
			expect(mention(7031n, { type: "role" })).toBe("<@&7031>");
		});

		it("as a user mention.", () => {
			expect(mention(7031n, { type: "user" })).toBe("<@7031>");
		});
	});
});

describe("trim()", () => {
	it("returns an empty string if an empty string was passed, regardless of the desired length.", () => {
		expect(trim("", 0)).toBe("");
		expect(trim("", 3)).toBe("");
		expect(trim("", 64)).toBe("");
	});

	it("does not trim the string if it's shorter than or of the specified length.", () => {
		const STRING = "This is a sample sentence.";

		expect(trim(STRING, STRING.length + 1)).toBe(STRING);
		expect(trim(STRING, STRING.length)).toBe(STRING);
	});

	it("makes the passed string trail off if it's not composed of words.", () => {
		expect(trim("qwertyuiopasdfghjklzxcvbnm", 20)).toBe("qwertyuiopasdfghj...");
	});

	it("trims the passed sentence, replacing the last trimmed word with a continuation indicator.", () => {
		expect(trim("This is a sample sentence that's too long to be displayed in full.", 50)).toBe(
			"This is a sample sentence that's too long to (...)",
		);
	});
});
