import { NextResponse } from 'next/server';

// ⚠️ TEMPORARILY DISABLED - preventing infinite loop issues
export async function POST() {
  // Return 200 to prevent cascading errors from failed error reporting
  return NextResponse.json({ 
    disabled: true, 
    reason: 'Error reporting temporarily disabled due to database issues' 
  }, { status: 200 });
}
