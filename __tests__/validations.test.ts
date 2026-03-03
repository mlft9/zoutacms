import { describe, it, expect } from "vitest";
import {
  passwordSchema,
  registerSchema,
  loginSchema,
  totpVerifySchema,
} from "@/lib/validations";

describe("passwordSchema", () => {
  it("accepts a valid password", () => {
    expect(passwordSchema.safeParse("Secure@123").success).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(passwordSchema.safeParse("Ab@1").success).toBe(false);
  });

  it("rejects passwords without uppercase", () => {
    expect(passwordSchema.safeParse("secure@123").success).toBe(false);
  });

  it("rejects passwords without digit", () => {
    expect(passwordSchema.safeParse("Secure@abc").success).toBe(false);
  });

  it("rejects passwords without special char", () => {
    expect(passwordSchema.safeParse("Secure1234").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Secure@123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "Secure@123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login without 2FA", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid login with 2FA code", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anypassword",
      totpCode: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid 2FA code length", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anypassword",
      totpCode: "12345", // 5 digits, invalid
    });
    expect(result.success).toBe(false);
  });
});

describe("totpVerifySchema", () => {
  it("accepts a 6-digit code", () => {
    expect(totpVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
  });

  it("rejects non-numeric codes", () => {
    expect(totpVerifySchema.safeParse({ code: "12345a" }).success).toBe(false);
  });

  it("rejects short codes", () => {
    expect(totpVerifySchema.safeParse({ code: "12345" }).success).toBe(false);
  });
});
