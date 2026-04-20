import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = '@offline_queue';
const MAX_RETRIES = 3;

class OfflineQueueService {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;

  async init() {
    await this.loadQueue();
    this.setupNetworkListener();
  }

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async enqueue(url: string, method: string, body?: unknown, headers?: Record<string, string>): Promise<void> {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(request);
    await this.saveQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      this.isProcessing = false;
      return;
    }

    const failedRequests: QueuedRequest[] = [];

    for (const request of this.queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
          body: request.body,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`Failed to process queued request ${request.id}:`, error);
        request.retryCount++;

        if (request.retryCount < MAX_RETRIES) {
          failedRequests.push(request);
        }
      }
    }

    this.queue = failedRequests;
    await this.saveQueue();
    this.isProcessing = false;
  }

  async clear() {
    this.queue = [];
    await this.saveQueue();
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueueService();
