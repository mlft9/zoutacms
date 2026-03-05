import { NextResponse } from "next/server";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

// Common error codes
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOTP_REQUIRED: "TOTP_REQUIRED",
  TOTP_INVALID: "TOTP_INVALID",
  TOTP_ALREADY_ENABLED: "TOTP_ALREADY_ENABLED",
  TOTP_NOT_ENABLED: "TOTP_NOT_ENABLED",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  PASSWORD_INCORRECT: "PASSWORD_INCORRECT",
  // Phase 2
  CLIENT_NOT_FOUND: "CLIENT_NOT_FOUND",
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
} as const;
