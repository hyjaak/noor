import { NextResponse } from "next/server";
import lessons from "../../../../packages/lessons/lessons.json";
export function GET() { return NextResponse.json({ status: "local", data: lessons }); }
