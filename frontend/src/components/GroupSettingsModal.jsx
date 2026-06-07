import { useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  X,
  Camera,
  UsersRound,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  LogOut,
  Trash2,
  Check,
  Pencil,
} from "lucide-react";

const GroupSettingsModal = ({ onClose }) => {
  const { selectedGroup, updateGroup, addMembers, removeMember, toggleAdmin, leaveGroup, deleteGroup } =
    useGroupStore();
  const { users } = useChatStore();
  const { authUser } = useAuthStore();

  const fileRef = useRef(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(selectedGroup.name);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [toAdd, setToAdd] = useState([]);

  const amAdmin = selectedGroup.admins?.some((a) => a._id === authUser._id);
  const memberIds = new Set(selectedGroup.members.map((m) => m._id));
  const candidates = users.filter((u) => !memberIds.has(u._id));

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateGroup(selectedGroup._id, { avatar: reader.result });
    reader.readAsDataURL(file);
  };

  const saveName = async () => {
    if (name.trim() && name.trim() !== selectedGroup.name) {
      await updateGroup(selectedGroup._id, { name: name.trim() });
    }
    setEditingName(false);
  };

  const confirmAddMembers = async () => {
    if (toAdd.length) await addMembers(selectedGroup._id, toAdd);
    setToAdd([]);
    setShowAddMembers(false);
  };

  const isUserAdmin = (id) => selectedGroup.admins?.some((a) => a._id === id);

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

        {/* Header: avatar + name */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="relative">
            {selectedGroup.avatar ? (
              <img
                src={selectedGroup.avatar}
                alt={selectedGroup.name}
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center">
                <UsersRound className="size-9 text-primary" />
              </div>
            )}
            {amAdmin && (
              <>
                <button
                  className="absolute -bottom-1 -right-1 btn btn-xs btn-circle btn-primary"
                  onClick={() => fileRef.current?.click()}
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
              </>
            )}
          </div>

          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className="input input-bordered input-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={saveName}>
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedGroup.name}</h2>
              {amAdmin && (
                <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setEditingName(true)}>
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-zinc-400">{selectedGroup.members.length} members</p>
        </div>

        {/* Members list */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Members</span>
          {amAdmin && !showAddMembers && (
            <button className="btn btn-ghost btn-xs" onClick={() => setShowAddMembers(true)}>
              <UserPlus className="size-4" /> Add
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto border border-base-300 rounded-lg divide-y divide-base-200">
          {showAddMembers ? (
            <>
              {candidates.map((u) => {
                const sel = toAdd.includes(u._id);
                return (
                  <button
                    key={u._id}
                    className="w-full p-2.5 flex items-center gap-3 hover:bg-base-200"
                    onClick={() =>
                      setToAdd((p) => (sel ? p.filter((x) => x !== u._id) : [...p, u._id]))
                    }
                  >
                    <img
                      src={u.profilePic || "/avatar.png"}
                      alt={u.fullName}
                      className="size-9 rounded-full object-cover"
                    />
                    <span className="flex-1 text-left truncate">{u.fullName}</span>
                    <span
                      className={`size-5 rounded-full border flex items-center justify-center ${
                        sel ? "bg-primary border-primary text-primary-content" : "border-base-300"
                      }`}
                    >
                      {sel && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
              {candidates.length === 0 && (
                <div className="text-center text-sm text-zinc-500 py-4">Everyone is already in</div>
              )}
            </>
          ) : (
            selectedGroup.members.map((m) => (
              <div key={m._id} className="p-2.5 flex items-center gap-3">
                <img
                  src={m.profilePic || "/avatar.png"}
                  alt={m.fullName}
                  className="size-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    {m.fullName}
                    {m._id === authUser._id && " (You)"}
                  </p>
                  {isUserAdmin(m._id) && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Shield className="size-3" /> Admin
                    </span>
                  )}
                </div>
                {amAdmin && m._id !== authUser._id && (
                  <div className="flex gap-1">
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      title={isUserAdmin(m._id) ? "Remove admin" : "Make admin"}
                      onClick={() => toggleAdmin(selectedGroup._id, m._id)}
                    >
                      {isUserAdmin(m._id) ? (
                        <ShieldOff className="size-4" />
                      ) : (
                        <Shield className="size-4" />
                      )}
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      title="Remove"
                      onClick={() => removeMember(selectedGroup._id, m._id)}
                    >
                      <UserMinus className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {showAddMembers ? (
          <div className="flex gap-2 mt-4">
            <button className="btn btn-sm flex-1" onClick={() => setShowAddMembers(false)}>
              Cancel
            </button>
            <button
              className="btn btn-sm btn-primary flex-1"
              onClick={confirmAddMembers}
              disabled={!toAdd.length}
            >
              Add {toAdd.length || ""}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-4">
            <button
              className="btn btn-sm btn-outline flex-1"
              onClick={() => {
                leaveGroup(selectedGroup._id);
                onClose();
              }}
            >
              <LogOut className="size-4" /> Leave
            </button>
            {amAdmin && (
              <button
                className="btn btn-sm btn-error flex-1"
                onClick={() => {
                  if (window.confirm("Delete this group for everyone?")) {
                    deleteGroup(selectedGroup._id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettingsModal;
