import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import EmojiPicker from "./EmojiPicker";
import GroupSettingsModal from "./GroupSettingsModal";
import {
  X,
  Send,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Download,
  UsersRound,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

const MAX_FILE_MB = 10;

const GroupChatContainer = () => {
  const {
    selectedGroup,
    groupMessages,
    isGroupMessagesLoading,
    sendGroupMessage,
    setSelectedGroup,
  } = useGroupStore();
  const { authUser } = useAuthStore();

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      return toast.error(`File must be smaller than ${MAX_FILE_MB}MB`);
    const reader = new FileReader();
    reader.onloadend = () =>
      setFilePreview({ data: reader.result, name: file.name, type: file.type });
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setText("");
    setImagePreview(null);
    setFilePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;
    await sendGroupMessage({
      text: text.trim(),
      image: imagePreview,
      file: filePreview || undefined,
    });
    resetComposer();
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="p-2.5 border-b border-base-300 flex items-center justify-between">
        <button className="flex items-center gap-3 text-left" onClick={() => setShowSettings(true)}>
          {selectedGroup.avatar ? (
            <img
              src={selectedGroup.avatar}
              alt={selectedGroup.name}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
              <UsersRound className="size-5 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-medium hover:underline">{selectedGroup.name}</h3>
            <p className="text-sm text-base-content/70 truncate max-w-[200px]">
              {selectedGroup.members?.map((m) => m.fullName).join(", ")}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setShowSettings(true)}
            title="Group settings"
          >
            <Settings className="size-5" />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setSelectedGroup(null)}
          >
            <X />
          </button>
        </div>
      </div>

      {/* Messages */}
      {isGroupMessagesLoading ? (
        <MessageSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupMessages.map((message) => {
            const sender = message.senderId || {};
            const isMine = sender._id === authUser._id;
            return (
              <div key={message._id} className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img src={sender.profilePic || "/avatar.png"} alt="profile pic" />
                  </div>
                </div>
                <div className="chat-header mb-1 flex items-center gap-1">
                  {!isMine && <span className="text-xs font-medium">{sender.fullName}</span>}
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
                <div className="chat-bubble flex flex-col">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.file?.url && (
                    <a
                      href={message.file.url}
                      target="_blank"
                      rel="noreferrer"
                      download={message.file.name}
                      className="flex items-center gap-2 bg-base-100/30 rounded-lg p-2 mb-2 hover:bg-base-100/50 transition-colors max-w-[240px]"
                    >
                      <FileText className="size-8 shrink-0" />
                      <span className="text-sm truncate flex-1">{message.file.name}</span>
                      <Download className="size-4 shrink-0 opacity-70" />
                    </a>
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            );
          })}
          {groupMessages.length === 0 && (
            <div className="text-center text-sm opacity-60 py-8">
              No messages yet. Say hello! 👋
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Composer */}
      <div className="p-4 w-full">
        {(imagePreview || filePreview) && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            {filePreview && (
              <div className="relative flex items-center gap-2 bg-base-200 border border-base-300 rounded-lg p-2 pr-7 max-w-[220px]">
                <FileText className="size-8 shrink-0 text-primary" />
                <span className="text-sm truncate">{filePreview.name}</span>
                <button
                  onClick={() => setFilePreview(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 items-center">
            <input
              type="text"
              className="w-full input input-bordered rounded-lg input-sm sm:input-md"
              placeholder="Message the group..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={imageInputRef}
              onChange={handleImage}
            />
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFile} />

            <EmojiPicker onSelect={(emoji) => setText((t) => t + emoji)} />
            <button
              type="button"
              className={`btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              className={`btn btn-circle ${filePreview ? "text-emerald-500" : "text-zinc-400"}`}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip size={20} />
            </button>
          </div>
          <button
            type="submit"
            className="btn btn-sm btn-circle"
            disabled={!text.trim() && !imagePreview && !filePreview}
          >
            <Send size={22} />
          </button>
        </form>
      </div>

      {showSettings && <GroupSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
export default GroupChatContainer;
