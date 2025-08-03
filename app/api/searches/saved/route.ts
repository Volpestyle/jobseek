import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth/auth-utils"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user?.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const savedSearches = await dynamoDBService.getSavedSearches(user.userId)

    return NextResponse.json({ searches: savedSearches })
  } catch (error) {
    console.error("Failed to get saved searches:", error)
    return NextResponse.json(
      { error: "Failed to get saved searches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user?.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, keywords, location, jobBoards, filters, runFrequency, skills, workPreferences } = body

    if (!name || !keywords || !location || !jobBoards || jobBoards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const savedSearch = await dynamoDBService.saveSearch({
      userId: user.userId,
      searchId: `search_${Date.now()}`,
      name,
      keywords,
      location,
      jobBoards,
      filters,
      skills,
      workPreferences,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      runFrequency,
    })

    return NextResponse.json({ search: savedSearch })
  } catch (error) {
    console.error("Failed to save search:", error)
    return NextResponse.json(
      { error: "Failed to save search" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user?.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchId = searchParams.get("searchId")

    if (!searchId) {
      return NextResponse.json(
        { error: "Search ID required" },
        { status: 400 }
      )
    }

    await dynamoDBService.deleteSavedSearch(user.userId, searchId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete saved search:", error)
    return NextResponse.json(
      { error: "Failed to delete saved search" },
      { status: 500 }
    )
  }
}