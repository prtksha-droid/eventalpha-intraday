export function shardItems(items, maxShardSize) {
  if (!Number.isInteger(maxShardSize) || maxShardSize <= 0) {
    throw new Error("Invalid max shard size");
  }

  if (!items.length) {
    return [];
  }

  const shardCount = Math.ceil(
    items.length / maxShardSize
  );

  const shards = Array.from(
    { length: shardCount },
    () => []
  );

  items.forEach((item, index) => {
    const shardIndex = index % shardCount;

    shards[shardIndex].push(item);
  });

  return shards;
}