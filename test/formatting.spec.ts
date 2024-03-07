import { capitalise, code, codeMultiline, decapitalise, list, mention, timestamp } from "../src/formatting";

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
