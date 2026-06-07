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
  const [showProfile, setShowProfile] = useState(false);

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

          {/* User info (click to view details) */}
          <button className="text-left" onClick={() => setShowProfile(true)}>
            <h3 className="font-medium hover:underline">{selectedUser.fullName}</h3>
            <p className={`text-sm ${isTyping ? "text-primary" : "text-base-content/70"}`}>
              {statusText}
            </p>
          </button>
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

      {/* User details modal */}
      {showProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-base-100 rounded-2xl p-6 w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2"
              onClick={() => setShowProfile(false)}
            >
              <X className="size-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-3">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="size-24 rounded-full object-cover border-4 border-base-300"
              />
              <div>
                <h2 className="text-xl font-semibold">{selectedUser.fullName}</h2>
                <p className={`text-sm ${isOnline ? "text-green-500" : "text-base-content/60"}`}>
                  {statusText}
                </p>
              </div>

              <div className="w-full text-left space-y-3 mt-2">
                <div>
                  <p className="text-xs text-zinc-400">About</p>
                  <p className="whitespace-pre-wrap">
                    {selectedUser.bio || <span className="text-zinc-500">No bio yet</span>}
                  </p>
                </div>
                {selectedUser.email && (
                  <div>
                    <p className="text-xs text-zinc-400">Email</p>
                    <p className="break-all">{selectedUser.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatHeader;
