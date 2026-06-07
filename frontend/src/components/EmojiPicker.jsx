import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

// Lightweight, dependency-free emoji picker grouped by category
const EMOJI_GROUPS = {
  Smileys: [
    "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😊", "😇", "🙂",
    "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "🤩", "🤔", "🤗",
    "😎", "🥳", "😏", "😴", "😭", "😡", "🥺", "😱", "🤯", "😬",
  ],
  Gestures: [
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "🙏",
    "💪", "👀", "🫶", "🤝", "👋", "✋", "🤙", "👈", "👉", "👆",
  ],
  Hearts: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️",
    "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💌",
  ],
  Objects: [
    "🔥", "🎉", "✨", "⭐", "🌟", "💯", "🎊", "🎁", "🏆", "🥇",
    "💡", "📌", "📎", "✅", "❌", "⚡", "💥", "🚀", "☕", "🍕",
  ],
};

const EmojiPicker = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("Smileys");
  const containerRef = useRef(null);

  // Close when clicking outside the popover
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="btn btn-circle text-zinc-400"
        onClick={() => setOpen((v) => !v)}
        title="Emoji"
      >
        <Smile size={20} />
      </button>

      {open && (
        <div className="absolute bottom-14 right-0 z-20 w-72 bg-base-200 border border-base-300 rounded-xl shadow-xl p-3">
          {/* Category tabs */}
          <div className="flex gap-1 mb-2">
            {Object.keys(EMOJI_GROUPS).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  group === g ? "bg-primary text-primary-content" : "hover:bg-base-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            {EMOJI_GROUPS[group].map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                className="text-xl hover:bg-base-300 rounded p-1 transition-colors"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
