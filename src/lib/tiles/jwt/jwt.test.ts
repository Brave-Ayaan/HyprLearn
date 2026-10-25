import { describe, it, expect } from "vitest";
import { decodeJwt, humanizeTimeFields, verifyHmac, supportedAlg } from "./jwt";

// The canonical jwt.io example token: HS256, signed with secret
// "your-256-bit-secret".
const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const SAMPLE_SECRET = "your-256-bit-secret";

describe("decodeJwt", () => {
  it("decodes header and payload JSON", () => {
    const decoded = decodeJwt(SAMPLE_TOKEN);
    expect(decoded.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decoded.payload).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("rejects a token without 3 segments", () => {
    expect(() => decodeJwt("not.a.valid.jwt.token")).toThrow();
    expect(() => decodeJwt("onlyone")).toThrow();
  });

  it("rejects invalid base64/JSON", () => {
    expect(() => decodeJwt("!!!.!!!.!!!")).toThrow();
  });
});

describe("humanizeTimeFields", () => {
  it("converts exp/iat/nbf unix timestamps to ISO strings", () => {
    const fields = humanizeTimeFields({ iat: 1516239022, other: "ignored" });
    expect(fields).toEqual([{ field: "iat", iso: new Date(1516239022 * 1000).toISOString() }]);
  });

  it("returns an empty list when the payload isn't an object", () => {
    expect(humanizeTimeFields(null)).toEqual([]);
    expect(humanizeTimeFields("string")).toEqual([]);
  });
});

describe("supportedAlg", () => {
  it("accepts only the HMAC algorithms", () => {
    expect(supportedAlg("HS256")).toBe("HS256");
    expect(supportedAlg("RS256")).toBeNull();
    expect(supportedAlg(undefined)).toBeNull();
  });
});

describe("verifyHmac", () => {
  it("verifies the jwt.io sample token against its known secret", async () => {
    const decoded = decodeJwt(SAMPLE_TOKEN);
    await expect(verifyHmac(decoded, SAMPLE_SECRET)).resolves.toBe(true);
  });

  it("rejects the wrong secret", async () => {
    const decoded = decodeJwt(SAMPLE_TOKEN);
    await expect(verifyHmac(decoded, "wrong-secret")).resolves.toBe(false);
  });
});
