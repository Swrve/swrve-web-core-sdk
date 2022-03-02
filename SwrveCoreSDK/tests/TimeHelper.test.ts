import {
  getTimestampSeconds,
  getTimestampMilliseconds,
  getISOString,
} from "../src/utils/TimeHelper";

const date = new Date("2018-07-09T14:24:55.820Z");
const time = 1531146295820;

describe("TimeHelper", () => {
  it("returns timestamp in seconds", () => {
    expect(getTimestampSeconds(date)).toBe(1531146295);
    expect(getTimestampSeconds(time)).toBe(1531146295);
  });

  it("returns timestamp in milliseconds", () => {
    expect(getTimestampMilliseconds(date)).toBe(1531146295820);
    expect(getTimestampMilliseconds(time)).toBe(1531146295820);
  });

  it("returns iso string", () => {
    expect(getISOString(date)).toBe("2018-07-09T14:24:55.820Z");
    expect(getISOString(time)).toBe("2018-07-09T14:24:55.820Z");
  });
});
