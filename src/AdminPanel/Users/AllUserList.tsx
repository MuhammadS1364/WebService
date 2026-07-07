import { useState, useEffect, useMemo } from "react";
import { SupaBaseFunction } from "../../lib/SupaBase";

export default function AllUsersList() {

  // State for users, UI controls, and loading/error handling
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  // 1. Fetch Users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);

      const { data, error } = await SupaBaseFunction
        .from('UserTable')
        .select('*');

      if (error) {
        console.error("Error fetching users from SupaBaseFunction:", error.message);
      } else {
        setUsers(data || []);
      }

      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  // 2. Toggle Active Status in SupaBaseFunction
  const handleToggleActive = async (email, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic UI update using functional state to prevent stale closures
    setUsers((prevUsers) => prevUsers.map(user =>
      user.UserEmail === email ? { ...user, IsActive: newStatus } : user
    ));

    const { error } = await SupaBaseFunction
      .from('UserTable')
      .update({ IsActive: newStatus })
      .eq('UserEmail', email);

    if (error) {
      console.error("Failed to update user status in Supabase:", error.message);
      // Revert the UI update if the database call fails
      setUsers((prevUsers) => prevUsers.map(user =>
        user.UserEmail === email ? { ...user, IsActive: currentStatus } : user
      ));
      alert("Failed to update user status. Please try again.");
    }
  };

  // 3. Dynamically extract unique roles for the dropdown
  const uniqueRoles = useMemo(() => {
    const roles = users.map(user => user.UserRole).filter(Boolean); // Filter out any undefined/null roles
    return [...new Set(roles)]; // Removes duplicates
  }, [users]);

  // 4. Combined Filter and Search Logic
  const filteredUsers = users.filter((user) => {
    const safeEmail = user.UserEmail || "";
    const safeId = user.UserId || "";
    
    // Search check (Safe against null values)
    const matchesSearch = safeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      safeId.toLowerCase().includes(searchQuery.toLowerCase());

    // Status check
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "Active" && user.IsActive) ||
      (statusFilter === "Inactive" && !user.IsActive);

    // Role check
    const matchesRole = roleFilter === "All" || user.UserRole === roleFilter;

    // Must match all active filters
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="mx-auto max-w-[1600px] p-4 font-sans text-gray-800">
      {/* --- CONTROLS HEADER --- */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between border border-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-gray-900">All Users</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by email or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-64"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="All">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 py-2 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Loading State Spinner/Message */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-gray-500">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading users...
        </div>
      ) : (
        <>
          {/* --- DESKTOP TABLE VIEW --- */}
          <div className="hidden md:block overflow-x-auto rounded-xl shadow-sm border border-gray-200 bg-white">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">User ID</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Auth Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Active Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.UserEmail || user.UserId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500 truncate ">{user.UserId}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{user.UserEmail}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {user.UserRole || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.IsAuthenticated ? (
                          <span className="text-green-600 font-medium">Verified</span>
                        ) : (
                          <span className="text-gray-400">Unverified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(user.UserEmail, user.IsActive)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${user.IsActive ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.IsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* --- MOBILE CARD VIEW --- */}
          <div className="flex flex-col gap-4 md:hidden">
            {filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
                No users found.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.UserEmail || user.UserId} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 break-all">{user.UserEmail}</span>
                      <span className="font-mono text-xs text-gray-500 mt-1 truncate max-w-52">ID: {user.UserId}</span>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {user.UserRole || 'N/A'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="text-sm">
                      Auth: {user.IsAuthenticated ? (
                        <span className="text-green-600 font-medium">Verified</span>
                      ) : (
                        <span className="text-gray-400">Unverified</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 font-medium">Active:</span>
                      <button
                        onClick={() => handleToggleActive(user.UserEmail, user.IsActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.IsActive ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.IsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}