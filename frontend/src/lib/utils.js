export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Human-friendly "last seen" label, e.g. "Last seen 5m ago" / "Last seen yesterday"
export function formatLastSeen(date) {
  if (!date) return "Offline";

  const then = new Date(date);
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Last seen just now";
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "Last seen yesterday";
  if (diffDays < 7) return `Last seen ${diffDays}d ago`;

  return `Last seen ${then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}
