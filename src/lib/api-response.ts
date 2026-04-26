import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    message: string;
    code?: string;
  };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

function normalizeInit(init?: number | ResponseInit) {
  return typeof init === "number" ? { status: init } : init;
}

export function apiSuccess<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, normalizeInit(init));
}

export function apiError(message: string, init?: number | ResponseInit, code?: string) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        message,
        ...(code ? { code } : {})
      }
    },
    normalizeInit(init)
  );
}

export function apiValidationError(error: ZodError, fallbackMessage: string) {
  return apiError(error.issues[0]?.message || fallbackMessage, 400, "VALIDATION_ERROR");
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
