import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { s3Service } from "@/lib/storage/s3.service"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { filename, contentType } = body

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type required" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and Word documents are allowed" },
        { status: 400 }
      )
    }

    // Generate pre-signed upload URL
    const { uploadUrl, s3Key } = await s3Service.getUploadUrl(
      session.user.id,
      filename,
      contentType
    )

    return NextResponse.json({ uploadUrl, s3Key })
  } catch (error) {
    console.error("Failed to generate upload URL:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resumes = await s3Service.listUserResumes(session.user.id)

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Failed to list resumes:", error)
    return NextResponse.json(
      { error: "Failed to list resumes" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const s3Key = searchParams.get("s3Key")

    if (!s3Key) {
      return NextResponse.json(
        { error: "S3 key required" },
        { status: 400 }
      )
    }

    // Verify the resume belongs to the user
    if (!s3Key.includes(`resumes/${session.user.id}/`)) {
      return NextResponse.json(
        { error: "Unauthorized to delete this resume" },
        { status: 403 }
      )
    }

    await s3Service.deleteResume(s3Key)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete resume:", error)
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    )
  }
}