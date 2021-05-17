export function makeQueue<T extends QueueItem>(): Queue<T> {
  const items: T[] = []
  const timestampMap: WeakMap<T, number> = new WeakMap()

  const queue: Queue<T> = {
    /**
     * Inserts a item to the end of the queue with guaranteed ordering.
     * items are ordered by its timestamp and then lexigraphical order of
     * its key.
     * @param newItem The item to insert into queue.
     * @param timestamp An optional timestamp to set for the item. Defaults to Date.now()
     */
    enqueue: (newItem: T, timestamp: number = Date.now()) => {
      const newItemTimestamp = timestampMap.get(newItem) ?? timestamp

      // Find the place to insert new item
      let endItemIndex = items.length - 1
      while (endItemIndex >= 0) {
        const endItem = items[endItemIndex]
        const endItemTimestamp = timestampMap.get(endItem)

        // Assert that endItem must have a timestamp
        if (endItemTimestamp == null)
          throw new Error('Missing timestamp for item in queue')

        // Compare new item to end item
        if (
          newItemTimestamp > endItemTimestamp ||
          (newItemTimestamp === endItemTimestamp && newItem.key > endItem.key)
        ) {
          break
        }

        // Decrement end item index
        --endItemIndex
      }

      // Save item
      items.splice(endItemIndex + 1, 0, newItem)
      timestampMap.set(newItem, newItemTimestamp)
    },
    dequeue: () => {
      const item = items.shift()
      if (item != null) {
        timestampMap.delete(item)
      }
      return item
    },
    requeue: (item: T, timestamp: number = Date.now()) => {
      queue.remove(item)
      timestampMap.set(item, timestamp)
      queue.enqueue(item)
    },
    remove: (item: T) => {
      const index = indexOfItemInQueue(item)

      if (index >= 0) {
        const [item] = items.splice(index, 1)
        timestampMap.delete(item)
      }
    },
    list: () => {
      return items
    }
  }

  return queue

  /**
   * Uses binary search to find the index of a given item in the queue.
   *
   * @param needleItem The item object for which to search.
   */
  function indexOfItemInQueue(needleItem: T): number {
    const needleItemTimestamp = timestampMap.get(needleItem)
    let l = 0
    let r = items.length - 1

    // Return -1 when there's no timestamp because we cannot search
    if (needleItemTimestamp == null) return -1

    while (l <= r) {
      // Use bit shift over division to avoid floats
      const index = (l + r) >> 1

      // Item in queue to compare
      const haystackItem = items[index]
      const haystackItemTimestamp = timestampMap.get(haystackItem)

      // Assert timestamp must exist for items in queue
      if (haystackItemTimestamp == null)
        throw new Error('Missing timestamp for item in queue')

      // Direction to continue binary search. Zero is a match.
      // Negative is to search lower and positive is to search higher.
      const direction =
        needleItem === haystackItem
          ? 0
          : needleItemTimestamp - haystackItemTimestamp !== 0
          ? needleItemTimestamp - haystackItemTimestamp
          : // Fallback to lexigraphical comparison (if timestamps match)
          needleItem.key > haystackItem.key
          ? 1
          : -1

      if (direction > 0) {
        // To search higher, increase left
        l = index + 1
      } else if (direction < 0) {
        // To search lower, decrease right
        r = index - 1
      } else {
        // If found return index
        return index
      }
    }

    // Return -1 when item cannot be found.
    return -1
  }
}

export interface Queue<T extends QueueItem> {
  enqueue: (item: T, timestamp?: number) => void
  dequeue: () => T | undefined
  requeue: (item: T, timestamp?: number) => void
  remove: (item: T) => void
  list: () => T[]
}

export interface QueueItem {
  key: string
}
