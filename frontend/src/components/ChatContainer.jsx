import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import Message from "./Message";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Pin, X } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    typingUsers,
    searchQuery,
    pinMessage,
  } = useChatStore();
  const messageEndRef = useRef(null);

  const isPeerTyping = typingUsers.includes(selectedUser._id);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPeerTyping]);

  const query = searchQuery.trim().toLowerCase();
  const pinnedMessages = messages.filter((m) => m.isPinned && !m.isDeleted);
  const displayedMessages = query
    ? messages.filter((m) => m.text?.toLowerCase().includes(query))
    : messages;

  const jumpToMessage = (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-lg");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 1500);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      {/* Pinned messages section */}
      {pinnedMessages.length > 0 && !query && (
        <div className="bg-base-200/60 border-b border-base-300 px-4 py-2 space-y-1 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-1 text-xs font-semibold opacity-70">
            <Pin className="size-3.5" /> Pinned ({pinnedMessages.length})
          </div>
          {pinnedMessages.map((m) => (
            <div key={m._id} className="flex items-center gap-2 text-sm group/pin">
              <button
                onClick={() => jumpToMessage(m._id)}
                className="flex-1 text-left truncate hover:underline"
              >
                {m.text || (m.image ? "📷 Photo" : "Message")}
              </button>
              <button
                onClick={() => pinMessage(m._id, false)}
                className="opacity-0 group-hover/pin:opacity-100 btn btn-ghost btn-xs btn-circle"
                title="Unpin"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search results count */}
      {query && (
        <div className="bg-base-200/60 border-b border-base-300 px-4 py-1.5 text-xs opacity-70">
          {displayedMessages.length} result{displayedMessages.length === 1 ? "" : "s"} for
          &quot;{searchQuery}&quot;
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayedMessages.map((message) => (
          <Message key={message._id} message={message} />
        ))}

        {query && displayedMessages.length === 0 && (
          <div className="text-center text-sm opacity-60 py-8">No messages found</div>
        )}

        {/* Typing indicator */}
        {isPeerTyping && !query && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble flex items-center gap-1 py-3">
              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce" />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
