export class Random {
  private state: number;

  constructor(seed = 0x1234abcd) {
    this.state = seed >>> 0;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0xffffffff;
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)] as T;
  }

  weightedPick<T>(items: Array<{ item: T; weight: number }>): T {
    let total = 0;
    for (const entry of items) {
      total += entry.weight;
    }
    if (total <= 0) {
      return items[0]?.item as T;
    }
    let roll = this.next() * total;
    for (const entry of items) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.item;
      }
    }
    return items[items.length - 1]?.item as T;
  }

  shuffle<T>(values: T[]): T[] {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const temp = values[i] as T;
      values[i] = values[j] as T;
      values[j] = temp;
    }
    return values;
  }
}
