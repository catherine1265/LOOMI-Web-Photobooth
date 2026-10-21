// Four-timestamp clock estimate: exclude API processing time from network delay.
export function estimateServerClock(sentAt, receivedAt, serverReceivedAt, serverTime) {
  if (![sentAt, receivedAt, serverReceivedAt, serverTime].every(Number.isFinite) ||
      receivedAt < sentAt || serverTime < serverReceivedAt) return null;
  return ((serverReceivedAt - sentAt) + (serverTime - receivedAt)) / 2;
}
