import { NextResponse } from 'next/server';

// In-memory mock storage for demo persistence
let savedCanvas = null;

export async function GET() {
  return NextResponse.json({
    success: true,
    data: savedCanvas || { message: 'No canvas saved yet' }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    savedCanvas = body;
    return NextResponse.json({
      success: true,
      message: 'Canvas project saved successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}
