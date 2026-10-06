import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sessions: [{ kind: "diagnostic", status: "completed" }],
  getTestResult: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: () => ({ from: () => ({ where: async () => state.sessions }) }) } }));
vi.mock("@/server/auth", () => ({ requireUser: async () => ({ userId: "student", profile: { timezone: "UTC" } }) }));
vi.mock("@/server/tests", () => ({ getTestResult: state.getTestResult }));
vi.mock("@/server/delivery-policy", () => ({ DeliveryBlocked: class extends Error {} }));
vi.mock("./test-results", () => ({ TestResults: () => null }));
vi.mock("./review-item", () => ({ ReviewItem: ({ n, initiallyOpen }: { n: number; initiallyOpen?: boolean }) => React.createElement("details", { open: initiallyOpen }, `Question ${n}`) }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: () => { throw new Error("REDIRECT"); },
}));
const { default: ResultsPage } = await import("./page");
const sessionId = "00000000-0000-0000-0000-000000000001";
const props = (review?: string) => ({ params: Promise.resolve({ sessionId }), searchParams: Promise.resolve(review ? { review } : {}) });
beforeEach(() => {
  vi.clearAllMocks();
  state.sessions = [{ kind: "diagnostic", status: "completed" }];
});
it("does not fetch or reveal answers when the diagnostic finishes", async () => {
  const html = renderToStaticMarkup(await ResultsPage(props()));
  expect(state.getTestResult).not.toHaveBeenCalled();
  expect(html).toContain("Diagnostic complete");
  expect(html).toContain("Review mistakes");
  expect(html).toContain("/tests#history");
  expect(html).not.toContain("<details");
  expect(html).not.toContain("Estimated");
});
it("opens a saved review only on request and keeps mistakes collapsed", async () => {
  state.getTestResult.mockResolvedValue({ items: [
    { moduleIdx: 0, position: 0, correct: true },
    { moduleIdx: 0, position: 1, correct: false },
  ] });
  const html = renderToStaticMarkup(await ResultsPage(props("mistakes")));
  expect(state.getTestResult).toHaveBeenCalledWith("student", sessionId);
  expect(html).toContain("Question 2");
  expect(html).not.toContain("Question 1");
  expect(html).not.toContain('open=""');
});
it("does not reveal an unavailable session", async () => {
  state.sessions = [];
  await expect(ResultsPage(props("mistakes"))).rejects.toThrow("NOT_FOUND");
  expect(state.getTestResult).not.toHaveBeenCalled();
});
