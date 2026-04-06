type RetryableFn = () => Promise<void>;

interface QueueItem {
  fn: RetryableFn;
  retries: number;
}

const MAX_DELAY_MS = 30_000;
const BASE_DELAY_MS = 1_000;
const MAX_RETRIES = 5;

function getBackoffDelay(retries: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, retries);
  return Math.min(delay, MAX_DELAY_MS);
}

class RetryQueue {
  private queue: QueueItem[] = [];
  private paused = false;
  private processing = false;

  get pendingCount(): number {
    return this.queue.length;
  }

  enqueue(fn: RetryableFn): void {
    this.queue.push({ fn, retries: 0 });
    this.processNext();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.paused || this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const item = this.queue[0];

    try {
      await item.fn();
      // Success: remove from queue
      this.queue.shift();
    } catch {
      // Failure: increment retries or drop
      item.retries += 1;
      if (item.retries > MAX_RETRIES) {
        this.queue.shift();
      } else {
        const delay = getBackoffDelay(item.retries);
        this.processing = false;
        setTimeout(() => this.processNext(), delay);
        return;
      }
    }

    this.processing = false;
    this.processNext();
  }
}

export const retryQueue = new RetryQueue();
