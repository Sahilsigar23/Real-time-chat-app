import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Reply } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
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
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    // Sending a message ends the typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitStopTyping();

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                : replyingTo.text || (replyingTo.image ? "📷 Photo" : "")}
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

      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
