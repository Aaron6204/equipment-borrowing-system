import { useState } from "react";
import { Ban, CheckCircle, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { Borrower } from "../types";
import { formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

interface SystemUser {
  _id: string;
  name: string;
  email: string;
  studentNumber: string;
  role: 'admin' | 'borrower';
  status: 'active' | 'suspended';
}

// Shows one borrower's standing, pulled directly from the backend
function StandingPanel({ borrowerId }: { borrowerId: string }) {
  // Using 'any' here so we can accept the new activeLoansList without strictly altering global types
  const standing = useFetch<any>(`/borrowers/${borrowerId}/standing`);

  if (standing.loading) return <p className="text-sm text-nu-muted">Checking standing...</p>;
  if (standing.error) return <p className="text-sm text-red-700">{standing.error}</p>;
  if (!standing.data) return null;

  const { blocked, activeLoans, overdueItems, unpaidTotal, reasons, activeLoansList } = standing.data;
  
  return (
    <div className={`rounded-xl p-4 text-sm ${blocked ? "bg-red-50 text-red-900 border border-red-200" : "bg-emerald-50 text-emerald-900 border border-emerald-200"}`}>
      <p className="flex items-center gap-2 font-semibold">
        {blocked ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
        {blocked ? "Blocked from borrowing" : "In good standing"}
      </p>
      <p className="mt-1">
        {activeLoans} active loan(s), {overdueItems} overdue, {formatPeso(unpaidTotal)} in unpaid fines
      </p>
      
      {/* NEW: Displays the specific active loans and their due dates */}
      {activeLoansList && activeLoansList.length > 0 && (
        <div className={`mt-3 border-t pt-3 ${blocked ? 'border-red-200' : 'border-emerald-200'}`}>
          <p className="font-bold text-xs uppercase tracking-wider mb-1 opacity-80">Currently Borrowed:</p>
          <ul className="list-disc list-inside space-y-1">
            {activeLoansList.map((loan: any, index: number) => {
              const formattedDate = loan.dueDate 
                ? new Date(loan.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                : "No due date";
              return (
                <li key={index}>
                  <span className="font-semibold">{loan.itemName}</span> &mdash; Due: {formattedDate}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {reasons.length > 0 && (
        <div className={`mt-3 border-t pt-3 ${blocked ? 'border-red-200' : 'border-emerald-200'}`}>
          <p className="font-bold text-xs uppercase tracking-wider mb-1 opacity-80">Account Flags:</p>
          <ul className="list-inside list-disc">
            {reasons.map((reason: string) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  
  const users = useFetch<SystemUser[]>("/users");
  const borrowers = useFetch<Borrower[]>("/borrowers");
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [openStanding, setOpenStanding] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SystemUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changeRole(targetUser: SystemUser, newRole: string) {
    if (targetUser._id === currentUser?.id) return showToast("You cannot change your own role.", "error");
    setBusyId(targetUser._id);
    try {
      await api.patch(`/users/${targetUser._id}/role`, { role: newRole });
      showToast(`${targetUser.name} is now an ${newRole}`);
      users.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(targetUser: SystemUser) {
    if (targetUser._id === currentUser?.id) return showToast("You cannot suspend yourself.", "error");
    const newStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    setBusyId(targetUser._id);
    try {
      await api.patch(`/users/${targetUser._id}/status`, { status: newStatus });
      showToast(`${targetUser.name} has been ${newStatus}`);
      users.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${toDelete._id}`);
      
      const matchingBorrower = borrowers.data?.find(b => b.email === toDelete.email);
      if (matchingBorrower) {
        await api.delete(`/borrowers/${matchingBorrower._id}`).catch(() => console.log("Borrower delete skipped due to history"));
      }

      showToast("User account deleted");
      users.refetch();
      borrowers.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = users.data ?? [];
  
  const filteredList = list.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase()) || 
                          (u.studentNumber || "").includes(search);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? (u.status || 'active') === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const isLoading = users.loading || borrowers.loading;
  const errorMsg = users.error || borrowers.error;

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage system access, borrower standing, and admin privileges" />

      {/* Search and Filters */}
      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="relative lg:col-span-2">
          <label htmlFor="search" className="sr-only">Search users</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" />
          <input 
            id="search" 
            className="input pl-9" 
            placeholder="Search by name, email, or ID" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <div>
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admins</option>
            <option value="borrower">Borrowers</option>
          </select>
        </div>
        <div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {isLoading && <Loading label="Loading users..." />}
      {errorMsg && <ErrorMessage message={errorMsg} onRetry={() => { users.refetch(); borrowers.refetch(); }} />}
      
      {!isLoading && !errorMsg && filteredList.length === 0 && (
        <EmptyState title="No users found" message="Try adjusting your search or filters." />
      )}

      {!isLoading && !errorMsg && filteredList.length > 0 && (
        <ul className="grid gap-3">
          {filteredList.map((u) => {
            const isMe = u._id === currentUser?.id;
            const busy = busyId === u._id;
            const isSuspended = u.status === 'suspended';
            
            const matchingBorrower = borrowers.data?.find(b => b.email === u.email || b.studentNumber === u.studentNumber);

            return (
              <li key={u._id} className={`card flex flex-col min-w-0 !p-4 sm:!p-5 ${isSuspended ? 'opacity-80 bg-red-50/20' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-nu-navy">{u.name} {isMe && "(You)"}</p>
                      <StatusBadge value={u.role} />
                      {isSuspended && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Suspended</span>}
                      {matchingBorrower?.type === 'faculty' && <StatusBadge value="faculty" />}
                    </div>
                    <p className="text-sm text-nu-muted mt-1">
                      {u.email} • ID: {u.studentNumber || "N/A"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-nu-line sm:border-0 pt-3 sm:pt-0">
                    {matchingBorrower && (
                      <button 
                        type="button" 
                        className="btn-outline btn-sm"
                        onClick={() => setOpenStanding(openStanding === u._id ? null : u._id)}
                      >
                        {openStanding === u._id ? "Hide standing" : "View standing"}
                      </button>
                    )}

                    <button 
                      className={`btn-outline btn-sm ${isSuspended ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                      disabled={busy || isMe} 
                      onClick={() => toggleStatus(u)}
                    >
                      {isSuspended ? <><CheckCircle className="size-4 mr-1 inline" /> Reactivate</> : <><Ban className="size-4 mr-1 inline" /> Suspend</>}
                    </button>

                    {u.role === 'borrower' ? (
                      <button className="btn-outline btn-sm text-nu-royal border-nu-royal hover:bg-blue-50" disabled={busy || isMe} onClick={() => changeRole(u, 'admin')}>
                        <ShieldCheck className="size-4 mr-1 inline" /> Promote
                      </button>
                    ) : (
                      <button className="btn-outline btn-sm text-orange-600 border-orange-200 hover:bg-orange-50" disabled={busy || isMe} onClick={() => changeRole(u, 'borrower')}>
                        <ShieldAlert className="size-4 mr-1 inline" /> Demote
                      </button>
                    )}
                    
                    <button className="btn-danger btn-sm" disabled={busy || isMe} onClick={() => setToDelete(u)}>
                      <Trash2 className="size-4 inline" />
                    </button>
                  </div>
                </div>

                {/* The Standing Panel Dropdown */}
                {openStanding === u._id && matchingBorrower && (
                  <div className="mt-4 border-t border-nu-line pt-4">
                    <StandingPanel borrowerId={matchingBorrower._id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete User Account?"
        message={`Are you sure you want to permanently delete the account for ${toDelete?.name}? This will attempt to remove their borrowing history as well.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}