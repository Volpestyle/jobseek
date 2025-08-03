import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const search = await dynamoDBService.getSavedSearch(session.user.id, params.searchId)
    
    if (!search) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 })
    }

    return NextResponse.json({ search })
  } catch (error) {
    console.error("Failed to get saved search:", error)
    return NextResponse.json(
      { error: "Failed to get saved search" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, keywords, location, jobBoards, filters, runFrequency, isActive, isEditable, skills, workPreferences } = body

    if (!name || !keywords || !location || !jobBoards || jobBoards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get existing search to preserve readonly fields
    const existingSearch = await dynamoDBService.getSavedSearch(session.user.id, params.searchId)
    
    if (!existingSearch) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 })
    }

    // Check if search is editable
    if (existingSearch.isEditable === false) {
      return NextResponse.json(
        { error: "This search cannot be edited" },
        { status: 403 }
      )
    }

    const updatedSearch = await dynamoDBService.updateSavedSearch({
      ...existingSearch,
      name,
      keywords,
      location,
      jobBoards,
      filters,
      skills,
      workPreferences,
      runFrequency,
      isActive: isActive !== undefined ? isActive : existingSearch.isActive,
      isEditable: isEditable !== undefined ? isEditable : existingSearch.isEditable,
    })

    return NextResponse.json({ search: updatedSearch })
  } catch (error) {
    console.error("Failed to update saved search:", error)
    return NextResponse.json(
      { error: "Failed to update saved search" },
      { status: 500 }
    )
  }
}