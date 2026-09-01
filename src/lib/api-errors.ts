import { NextResponse } from "next/server";
export function apiError(error: unknown) { if (error instanceof Error && error.message === "AUTH_REQUIRED") return NextResponse.json({ error: "Authentication required." }, { status: 401 }); console.error(error); return NextResponse.json({ error: "Database request failed." }, { status: 503 }); }
