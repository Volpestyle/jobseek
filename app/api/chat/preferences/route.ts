import { NextRequest, NextResponse } from "next/server";
import {
  getChatPreferences,
  saveChatPreference,
  deleteChatPreference,
} from "@/lib/db";

export async function GET() {
  const preferences = getChatPreferences();
  return NextResponse.json(preferences);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, answer, category } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    const id = saveChatPreference(question, answer, category || null);
    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save preference" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id parameter" }, { status: 400 });
  }

  const deleted = deleteChatPreference(id);
  if (!deleted) {
    return NextResponse.json({ error: "Preference not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
