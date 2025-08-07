import { NextRequest } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth-utils'
import { wallcrawlerService } from '@/lib/wallcrawler.server'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ error: 'Authentication required' })}\n\n`),
        { status: 401 }
      )
    }

    const body = await request.json()
    const { keywords, location, jobBoard } = body

    if (!keywords || !location || !jobBoard) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ error: 'Missing required fields' })}\n\n`),
        { status: 400 }
      )
    }

    // Create a TransformStream to handle the SSE
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Start the job search with streaming
    wallcrawlerService.runJobSearchWithStream({
      keywords,
      location,
      jobBoard,
      userMetadata: {
        userId: user.userId,
        isAnonymous: user.isAnonymous
      }
    }, async (event) => {
      // Stream each event to the client
      const message = `data: ${JSON.stringify(event)}\n\n`
      await writer.write(encoder.encode(message))
      
      // If it's the final event, close the stream
      if (event.type === 'complete' || event.type === 'error') {
        await writer.close()
      }
    }).catch(async (error) => {
      // Send error and close stream
      const errorMessage = `data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message || 'Search failed' 
      })}\n\n`
      await writer.write(encoder.encode(errorMessage))
      await writer.close()
    })

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Failed to start job search stream:', error)
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Failed to start search' 
      })}\n\n`),
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        }
      }
    )
  }
}