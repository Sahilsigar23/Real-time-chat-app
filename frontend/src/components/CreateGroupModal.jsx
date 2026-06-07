import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { X, Camera, UsersRound, Check } from "lucide-react";

const CreateGroupModal = ({ onClose }) => {
  const { users } = useChatStore();
  const { createGroup, isCreatingGroup, selectGroup } = useGroupStore();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [selected, setSelected] = useState([]); // userIds
  const fileRef = useRef(null);

  const toggleMember = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const group = await createGroup({ name: name.trim(), members: selected, avatar });
    if (group) {
      selectGroup(group);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-2xl p-6 w-full max-w-md relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2" onClick={onClose}>
          <X className="size-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Create Group</h2>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt="avatar" className="size-16 rounded-full object-cover" />
            ) : (
              <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center">
                <UsersRound className="size-7 text-primary" />
              </div>
            )}
            <button
              className="absolute -bottom-1 -right-1 btn btn-xs btn-circle btn-primary"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileRef}
              onChange={handleAvatar}
            />
          </div>
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Member selection */}
        <p className="text-sm font-medium mb-2">
          Add members{selected.length > 0 ? ` (${selected.length})` : ""}
        </p>
        <div className="flex-1 overflow-y-auto border border-base-300 rounded-lg divide-y divide-base-200">
          {users.map((user) => {
            const isSel = selected.includes(user._id);
            return (
              <button
                key={user._id}
                onClick={() => toggleMember(user._id)}
                className="w-full p-2.5 flex items-center gap-3 hover:bg-base-200 transition-colors"
              >
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-9 rounded-full object-cover"
                />
                <span className="flex-1 text-left truncate">{user.fullName}</span>
                <span
                  className={`size-5 rounded-full border flex items-center justify-center ${
                    isSel ? "bg-primary border-primary text-primary-content" : "border-base-300"
                  }`}
                >
                  {isSel && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
          {users.length === 0 && (
            <div className="text-center text-sm text-zinc-500 py-4">No contacts available</div>
          )}
        </div>

        <button
          className="btn btn-primary mt-4"
          onClick={handleCreate}
          disabled={!name.trim() || isCreatingGroup}
        >
          {isCreatingGroup ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
};

export default CreateGroupModal;
