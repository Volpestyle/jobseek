import { NextRequest, NextResponse } from "next/server";
import { deleteJob } from "@/lib/db";

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get("link");

    if (!link) {
        return NextResponse.json({ error: "Missing link parameter" }, { status: 400 });
    }

    try {
        const affected = deleteJob(link);
        return NextResponse.json({ success: true, affected });
    } catch (err) {
        console.error("Error deleting job:", err);
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
