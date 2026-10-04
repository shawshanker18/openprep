import { describe, expect, it } from "vitest";
import { boundedBody, MAX_FILE_BYTES, validFile } from "./file-policy";
describe("private file validation", () => {
  it("checks signatures and blocks active content", () => {
    expect(validFile(Buffer.from([137,80,78,71,13,10,26,10]), "image/png")).toBe(true);
    expect(validFile(Buffer.from("<svg onload=alert(1)>"), "image/png")).toBe(false);
    expect(validFile(Buffer.from("<html>"), "text/html")).toBe(false);
    expect(validFile(Buffer.from("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(validFile(Buffer.alloc(0), "image/png")).toBe(false);
    expect(validFile(Buffer.alloc(MAX_FILE_BYTES + 1), "image/png")).toBe(false);
  });
  it("bounds streamed uploads even without content-length", async () => {
    const request = new Request("https://example.com", { method: "POST", body: new Uint8Array(MAX_FILE_BYTES + 1) });
    await expect(boundedBody(request)).rejects.toThrow("File too large");
    expect(await boundedBody(new Request("https://example.com", { method: "POST", body: "hello" }))).toEqual(Buffer.from("hello"));
  });
});
