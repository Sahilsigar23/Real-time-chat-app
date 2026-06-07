import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import {
  Check,
  CheckCheck,
  SmilePlus,
  Reply,
  Pencil,
  Trash2,
  MoreVertical,
  Pin,
  PinOff,
} from "lucide-react";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "🔥", "🎉"];

// Wrap occurrences of `query` in <mark> for in-conversation search
const highlightText = (text, query) => {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-warning text-warning-content rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const Message = ({ message }) => {
  const { authUser } = useAuthStore();
  const {
    selectedUser,
    reactToMessage,
    editMessage,
    deleteMessage,
    setReplyingTo,
    pinMessage,
    searchQuery,
  } = useChatStore();

  const isMine = message.senderId === authUser._id;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  // Group reactions by emoji -> count, and track which emoji I picked
  const grouped = {};
  let myEmoji = null;
  for (const r of message.reactions || []) {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    if (r.userId === authUser._id) myEmoji = r.emoji;
  }

  const senderName = (id) =>
    id === authUser._id ? "You" : selectedUser?.fullName || "User";

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) {
      setIsEditing(false);
      return;
    }
    await editMessage(message._id, trimmed);
    setIsEditing(false);
  };

  return (
    <div id={`msg-${message._id}`} className={`chat group ${isMine ? "chat-end" : "chat-start"}`}>
      <div className="chat-image avatar">
        <div className="size-10 rounded-full border">
          <img
            src={
              isMine
                ? authUser.profilePic || "/avatar.png"
                : selectedUser.profilePic || "/avatar.png"
            }
            alt="profile pic"
          />
        </div>
      </div>

      <div className="chat-header mb-1 flex items-center gap-1">
        <time className="text-xs opacity-50 ml-1">{formatMessageTime(message.createdAt)}</time>
        {message.isEdited && !message.isDeleted && (
          <span className="text-xs opacity-50">(edited)</span>
        )}
        {message.isPinned && !message.isDeleted && (
          <Pin className="size-3 opacity-60" title="Pinned" />
        )}
        {isMine && !message.isDeleted && (
          <span
            className={message.status === "read" ? "text-sky-400" : "opacity-50"}
            title={message.status}
          >
            {message.status === "sent" ? (
              <Check className="size-3.5" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
          </span>
        )}
      </div>

      <div className="chat-bubble flex flex-col relative">
        {/* Reply preview */}
        {message.replyTo && !message.isDeleted && (
          <div className="mb-2 border-l-2 border-primary/60 bg-base-100/30 rounded px-2 py-1 text-xs">
            <span className="font-medium opacity-80">
              {senderName(message.replyTo.senderId)}
            </span>
            <p className="opacity-70 truncate max-w-[200px]">
              {message.replyTo.isDeleted
                ? "Message deleted"
                : message.replyTo.text || (message.replyTo.image ? "📷 Photo" : "")}
            </p>
          </div>
        )}

        {message.isDeleted ? (
          <p className="italic opacity-60 flex items-center gap-1">
            <Trash2 className="size-3.5" /> This message was deleted
          </p>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              ref={editInputRef}
              className="input input-bordered input-sm text-base-content"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn btn-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-xs btn-primary" onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.image && (
              <img
                src={message.image}
                alt="Attachment"
                className="sm:max-w-[200px] rounded-md mb-2"
              />
            )}
            {message.text && <p>{highlightText(message.text, searchQuery)}</p>}
          </>
        )}
      </div>

      {/* Reactions */}
      {!message.isDeleted && Object.keys(grouped).length > 0 && (
        <div className="chat-footer mt-1 flex flex-wrap gap-1">
          {Object.entries(grouped).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => reactToMessage(message._id, emoji)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors ${
                myEmoji === emoji
                  ? "bg-primary/20 border-primary"
                  : "bg-base-200 border-base-300 hover:bg-base-300"
              }`}
            >
              <span>{emoji}</span>
              <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hover actions */}
      {!message.isDeleted && !isEditing && (
        <div
          className={`chat-footer flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
            isMine ? "flex-row-reverse" : ""
          }`}
        >
          {/* Quick reaction picker */}
          <div className="dropdown dropdown-top">
            <button tabIndex={0} className="btn btn-ghost btn-xs btn-circle" title="React">
              <SmilePlus className="size-4" />
            </button>
            <div
              tabIndex={0}
              className="dropdown-content z-10 menu bg-base-200 rounded-box shadow flex-row p-1 gap-1"
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="text-lg hover:scale-125 transition-transform px-1"
                  onClick={(e) => {
                    reactToMessage(message._id, emoji);
                    e.currentTarget.closest(".dropdown")?.querySelector("button")?.blur();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-ghost btn-xs btn-circle"
            title="Reply"
            onClick={() => setReplyingTo(message)}
          >
            <Reply className="size-4" />
          </button>

          {/* More menu */}
          <div className={`dropdown dropdown-top ${isMine ? "dropdown-end" : ""}`}>
            <button tabIndex={0} className="btn btn-ghost btn-xs btn-circle" title="More">
              <MoreVertical className="size-4" />
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content z-10 menu bg-base-200 rounded-box shadow w-44 p-1"
            >
              <li>
                <button onClick={() => pinMessage(message._id, !message.isPinned)}>
                  {message.isPinned ? (
                    <>
                      <PinOff className="size-4" /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="size-4" /> Pin
                    </>
                  )}
                </button>
              </li>
              {isMine && (
                <li>
                  <button onClick={() => setIsEditing(true)}>
                    <Pencil className="size-4" /> Edit
                  </button>
                </li>
              )}
              <li>
                <button onClick={() => deleteMessage(message._id, "me")}>
                  <Trash2 className="size-4" /> Delete for me
                </button>
              </li>
              {isMine && (
                <li>
                  <button
                    className="text-error"
                    onClick={() => deleteMessage(message._id, "everyone")}
                  >
                    <Trash2 className="size-4" /> Delete for everyone
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
