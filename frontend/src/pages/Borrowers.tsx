import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import { borrowerSchema } from "../schemas/borrowerSchema";
import type { BorrowerFormValues } from "../schemas/borrowerSchema";
import type { Borrower, Standing } from "../types";
import { formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";

const emptyForm: BorrowerFormValues = { studentNumber: "", name: "", email: "", type: "student", status: "active" };

// Shows one borrower's standing, which is computed by the API.
function StandingPanel({ borrowerId }: { borrowerId: string }) {
  const standing = useFetch<Standing>(`/borrowers/${borrowerId}/standing`);

  if (standing.loading) return <p className="text-sm text-nu-muted">Checking standing...</p>;
  if (standing.error) return <p className="text-sm text-red-700">{standing.error}</p>;
  if (!standing.data) return null;

  const { blocked, activeLoans, overdueItems, unpaidTotal, reasons } = standing.data;
  return (
    <div className={`rounded-xl p-4 text-sm ${blocked ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
      <p className="flex items-center gap-2 font-semibold">
        {blocked ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
        {blocked ? "Blocked from borrowing" : "In good standing"}
      </p>
      <p className="mt-1">
        {activeLoans} active loan(s), {overdueItems} overdue, {formatPeso(unpaidTotal)} in unpaid fines
      </p>
      {reasons.length > 0 && (
        <ul className="mt-1 list-inside list-disc">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Page 6: the people who may borrow, with a form to add or edit them.
export default function Borrowers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const borrowers = useFetch<Borrower[]>(
    debouncedSearch ? `/borrowers?search=${encodeURIComponent(debouncedSearch)}` : "/borrowers"
  );
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Borrower | null>(null);
  const [openStanding, setOpenStanding] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Borrower | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BorrowerFormValues>({ resolver: zodResolver(borrowerSchema), defaultValues: emptyForm });

  function openCreate() {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(borrower: Borrower) {
    setEditing(borrower);
    reset({
      studentNumber: borrower.studentNumber,
      name: borrower.name,
      email: borrower.email,
      type: borrower.type,
      status: borrower.status,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(values: BorrowerFormValues) {
    try {
      if (editing) {
        await api.put(`/borrowers/${editing._id}`, values);
        showToast(`${values.name} updated`);
      } else {
        await api.post("/borrowers", values);
        showToast(`${values.name} added`);
      }
      setFormOpen(false);
      borrowers.refetch();
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/borrowers/${toDelete._id}`);
      showToast(`${toDelete.name} deleted`);
      borrowers.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = borrowers.data ?? [];

  return (
    <>
      <PageHeader title="Borrowers" subtitle="Students and faculty who may borrow from the equipment room">
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Plus className="size-4" /> Add borrower
        </button>
      </PageHeader>

      {formOpen && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mb-6">
          <h2 className="text-lg font-bold text-nu-navy">{editing ? `Edit ${editing.name}` : "New borrower"}</h2>
          {errors.root && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
              {errors.root.message}
            </p>
          )}
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="ID number" htmlFor="studentNumber" error={errors.studentNumber?.message}>
              <input id="studentNumber" className={`input ${errors.studentNumber ? "input-error" : ""}`} placeholder="e.g. 2024-100123" {...register("studentNumber")} />
            </FormField>
            <FormField label="Full name" htmlFor="borrower-name" error={errors.name?.message}>
              <input id="borrower-name" className={`input ${errors.name ? "input-error" : ""}`} {...register("name")} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <input id="email" type="email" className={`input ${errors.email ? "input-error" : ""}`} {...register("email")} />
            </FormField>
            <FormField label="Type" htmlFor="borrower-type" error={errors.type?.message} hint="Faculty get twice the loan period">
              <select id="borrower-type" className="input" {...register("type")}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </FormField>
            <FormField label="Status" htmlFor="borrower-status" error={errors.status?.message} hint="Inactive borrowers cannot borrow">
              <select id="borrower-status" className="input" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editing ? "Save changes" : "Add borrower"}
            </button>
          </div>
        </form>
      )}

      <div className="relative mb-4 max-w-sm">
        <label htmlFor="borrower-search" className="sr-only">Search borrowers</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" />
        <input id="borrower-search" className="input pl-9" placeholder="Search by name or ID number" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {borrowers.loading && <Loading label="Loading borrowers..." />}
      {borrowers.error && <ErrorMessage message={borrowers.error} onRetry={borrowers.refetch} />}
      {!borrowers.loading && !borrowers.error && list.length === 0 && (
        <EmptyState
          title={search ? "No borrower matches your search" : "No borrowers yet"}
          message={search ? "Try another name or ID number." : "Add the first borrower to start lending."}
        />
      )}

      {!borrowers.loading && !borrowers.error && list.length > 0 && (
        <ul className="card divide-y divide-nu-line !p-0">
          {list.map((borrower) => (
            <li key={borrower._id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-nu-navy">{borrower.name}</p>
                  <p className="truncate text-sm text-nu-muted">
                    {borrower.studentNumber} · {borrower.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge value={borrower.type} />
                    <StatusBadge value={borrower.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => setOpenStanding(openStanding === borrower._id ? null : borrower._id)}
                    aria-expanded={openStanding === borrower._id}
                  >
                    {openStanding === borrower._id ? "Hide standing" : "View standing"}
                  </button>
                  <button type="button" className="btn-outline btn-sm" onClick={() => openEdit(borrower)} aria-label={`Edit ${borrower.name}`}>
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(borrower)} aria-label={`Delete ${borrower.name}`}>
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {openStanding === borrower._id && (
                <div className="mt-3">
                  <StandingPanel borrowerId={borrower._id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete borrower?"
        message={`"${toDelete?.name}" will be permanently removed.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
