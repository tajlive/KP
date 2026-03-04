export interface EventLog {
  timestamp: number;
  type: string;
  data: unknown;
}

export class HistoryStore {
  private events: EventLog[] = [];

  log(type: string, data: unknown) {
    this.events.push({
      timestamp: Date.now(),
      type,
      data,
    });
  }

  getLast30Days() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.events.filter((e) => e.timestamp >= cutoff);
  }

  getAll() {
    return this.events;
  }

  replay(callback: (event: EventLog) => void) {
    this.events.forEach((e) => callback(e));
  }
}
