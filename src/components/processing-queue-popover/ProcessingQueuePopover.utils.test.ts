import { describe, expect, it, jest } from "@jest/globals";
import { formatCreatedAt } from "./ProcessingQueuePopover.utils";

describe("formatCreatedAt", () => {
  it("returns formatted time for valid timestamps", () => {
    const spy = jest
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockReturnValue("09:41 AM");

    expect(formatCreatedAt("2024-01-01T09:41:00Z")).toBe("09:41 AM");

    spy.mockRestore();
  });

  it("returns fallback string for missing timestamps", () => {
    expect(formatCreatedAt(undefined)).toBe("Just now");
  });

  it("returns fallback string for invalid timestamps", () => {
    expect(formatCreatedAt("not-a-date")).toBe("Just now");
  });
});

