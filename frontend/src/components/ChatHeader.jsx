import { useState } from "react";
import { Search, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers, searchQuery, setSearchQuery } =
    useChatStore();
  const { onlineUsers, lastSeenMap } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUsers.includes(selectedUser._id);

  const statusText = isTyping
    ? "typing..."
    : isOnline
    ? "Online"
    : formatLastSeen(lastSeenMap[selectedUser._id] || selectedUser.lastSeen);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className={`text-sm ${isTyping ? "text-primary" : "text-base-content/70"}`}>
              {statusText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => (showSearch ? closeSearch() : setShowSearch(true))}
            title="Search messages"
          >
            <Search className="size-5" />
          </button>

          {/* Close button */}
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              autoFocus
              type="text"
              className="input input-bordered input-sm w-full pl-9"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            />
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={closeSearch}>
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
};
export default ChatHeader;
