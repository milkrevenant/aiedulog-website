import { NextRequest, NextResponse } from 'next/server';
import { getNotificationService } from '@/lib/services/notification-service';

/**
 * POST /api/workers/notification-processor
 * Process notification queue (for background workers)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify worker authorization (in production, use proper authentication)
    const authHeader = request.headers.get('authorization');
    const workerToken = process.env.WORKER_TOKEN || 'dev-worker-token';
    
    if (!authHeader || authHeader !== `Bearer ${workerToken}`) {
      return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 });
    }

    const body = await request.json();
    const { batchSize = 10, workerId = 'default' } = body;

    // Process notification queue
    const result = await getNotificationService().processNotificationQueue(batchSize);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      workerId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in notification processor worker:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Worker error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/workers/notification-processor
 * Get worker status and queue metrics
 */
export async function GET() {
  try {
    // This would typically query the database for queue status
    const queueStatus = {
      pendingCount: 0, // Would get actual count from database
      processingCount: 0,
      failedCount: 0,
      completedToday: 0,
      lastProcessedAt: new Date().toISOString(),
      workerStatus: 'active'
    };

    return NextResponse.json({
      success: true,
      status: queueStatus
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Worker status error' 
    }, { status: 500 });
  }
}