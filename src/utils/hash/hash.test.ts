import toHash from "./hash";

describe("toHash function", () => {
  it("should generate a SHA-256 hash", function () {
    // b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b
    expect(toHash("foo")).toEqual(
      "b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b"
    );
  });

  it("should produce the same hash with the same arguments in any order", function () {
    expect(toHash("one", "two", "three")).toEqual(
      toHash("three", "one", "two")
    );
  });

  it("should produce when the properties have changed in inputs", function () {
    const foo: { [key: string]: any } = {};
    const originalHash = toHash(foo);
    foo["a"] = "a";
    expect(toHash(foo)).not.toEqual(originalHash);
  });
});
