import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UsersRound, Plus } from "lucide-react";
import { formatLastSeen } from "../lib/utils";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, unreadCounts } =
    useChatStore();
  const { groups, selectedGroup, selectGroup, groupUnread } = useGroupStore();

  const { onlineUsers, lastSeenMap } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [tab, setTab] = useState("direct"); // "direct" | "groups"
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const handleSelectUser = (user) => {
    useGroupStore.getState().setSelectedGroup(null);
    setSelectedUser(user);
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          <button
            className={`flex-1 btn btn-xs sm:btn-sm ${tab === "direct" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("direct")}
          >
            <Users className="size-4" />
            <span className="hidden lg:inline">Direct</span>
          </button>
          <button
            className={`flex-1 btn btn-xs sm:btn-sm ${tab === "groups" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("groups")}
          >
            <UsersRound className="size-4" />
            <span className="hidden lg:inline">Groups</span>
          </button>
        </div>

        {tab === "direct" && (
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        )}

        {tab === "groups" && (
          <button
            className="mt-3 btn btn-sm btn-outline w-full"
            onClick={() => setShowCreateGroup(true)}
          >
            <Plus className="size-4" />
            <span className="hidden lg:inline">New Group</span>
          </button>
        )}
      </div>

      {/* Direct tab */}
      {tab === "direct" && (
        <div className="overflow-y-auto w-full py-3">
          {filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""
              }`}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                )}
                {unreadCounts[user._id] > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold">
                    {unreadCounts[user._id] > 99 ? "99+" : unreadCounts[user._id]}
                  </span>
                )}
              </div>

              <div className="hidden lg:flex flex-1 items-center justify-between min-w-0">
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {onlineUsers.includes(user._id)
                      ? "Online"
                      : formatLastSeen(lastSeenMap[user._id] || user.lastSeen)}
                  </div>
                </div>
                {unreadCounts[user._id] > 0 && (
                  <span className="ml-2 shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold">
                    {unreadCounts[user._id] > 99 ? "99+" : unreadCounts[user._id]}
                  </span>
                )}
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center text-zinc-500 py-4">No contacts</div>
          )}
        </div>
      )}

      {/* Groups tab */}
      {tab === "groups" && (
        <div className="overflow-y-auto w-full py-3">
          {groups.map((group) => (
            <button
              key={group._id}
              onClick={() => selectGroup(group)}
              className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
              }`}
            >
              <div className="relative mx-auto lg:mx-0">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="size-12 object-cover rounded-full"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <UsersRound className="size-6 text-primary" />
                  </div>
                )}
                {groupUnread[group._id] > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold">
                    {groupUnread[group._id] > 99 ? "99+" : groupUnread[group._id]}
                  </span>
                )}
              </div>

              <div className="hidden lg:flex flex-1 items-center justify-between min-w-0">
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {group.members?.length || 0} members
                  </div>
                </div>
                {groupUnread[group._id] > 0 && (
                  <span className="ml-2 shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-primary-content text-xs font-bold">
                    {groupUnread[group._id] > 99 ? "99+" : groupUnread[group._id]}
                  </span>
                )}
              </div>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="text-center text-zinc-500 py-4 px-2 text-sm">
              No groups yet. Create one!
            </div>
          )}
        </div>
      )}

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </aside>
  );
};
export default Sidebar;
