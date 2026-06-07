import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Reply, Paperclip, FileText } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "./EmojiPicker";

const MAX_FILE_MB = 10;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // { data, name, type }
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const { sendMessage, selectedUser, replyingTo, setReplyingTo } = useChatStore();
  const { authUser, socket } = useAuthStore();

  const replyAuthor =
    replyingTo &&
    (replyingTo.senderId === authUser._id ? "yourself" : selectedUser?.fullName || "user");

  // Tell the peer when we start/stop composing a message
  const emitStopTyping = () => {
    if (!socket || !selectedUser || !isTypingRef.current) return;
    isTypingRef.current = false;
    socket.emit("stopTyping", { receiverId: selectedUser._id });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !selectedUser) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { receiverId: selectedUser._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(emitStopTyping, 1500);
  };

  // Stop the indicator if we switch chats or unmount while "typing"
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitStopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?._id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_FILE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () =>
      setFilePreview({ data: reader.result, name: file.name, type: file.type });
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeFile = () => {
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    textInputRef.current?.focus();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    // Sending a message ends the typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitStopTyping();

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: filePreview || undefined,
      });

      // Clear form
      setText("");
      removeImage();
      removeFile();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Reply preview banner */}
      {replyingTo && (
        <div className="mb-3 flex items-center gap-2 bg-base-200 rounded-lg p-2 border-l-4 border-primary">
          <Reply className="size-4 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">Replying to {replyAuthor}</p>
            <p className="text-sm opacity-70 truncate">
              {replyingTo.isDeleted
                ? "Message deleted"
                : replyingTo.text ||
                  (replyingTo.image ? "📷 Photo" : replyingTo.file ? "📎 File" : "")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
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
                onClick={removeImage}
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
                onClick={removeFile}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center">
          <input
            ref={textInputRef}
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
          />

          {/* Hidden file inputs */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={imageInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <EmojiPicker onSelect={insertEmoji} />

          <button
            type="button"
            className={`btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image"
          >
            <Image size={20} />
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
  );
};
export default MessageInput;
