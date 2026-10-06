import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useToast } from "../hooks/useToast";
import { categorySchema } from "../schemas/categorySchema";
import type { CategoryFormValues } from "../schemas/categorySchema";
import type { Category } from "../types";
import { formatPeso } from "../utils/format";
import FormField from "./FormField";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  categories: Category[];
  onChanged: () => void; // tells the parent page to reload its data
}

// A small panel on the Equipment page for adding and deleting categories.
export default function CategoryManager({ categories, onChanged }: Props) {
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", maxLoanDays: 3, dailyFee: 10 },
  });

  async function onSubmit(values: CategoryFormValues) {
    try {
      await api.post("/categories", values);
      showToast(`Category "${values.name}" added`);
      reset();
      onChanged();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${toDelete._id}`);
      showToast(`Category "${toDelete.name}" deleted`);
      onChanged();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <section className="card mt-8">
      <h2 className="text-lg font-bold text-nu-navy">Categories</h2>
      <p className="mt-1 text-sm text-nu-muted">A category sets the loan period and the daily overdue fee of its items.</p>

      {categories.length === 0 ? (
        <p className="mt-4 rounded-lg bg-nu-mist p-4 text-sm text-nu-muted">No categories yet. Add the first one below.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category._id} className="flex items-start justify-between gap-2 rounded-xl border border-nu-line p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-nu-navy">{category.name}</p>
                <p className="text-xs text-nu-muted">
                  {category.maxLoanDays} day(s), {formatPeso(category.dailyFee)} per day late
                </p>
              </div>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-nu-muted hover:bg-red-50 hover:text-red-700"
                onClick={() => setToDelete(category)}
                aria-label={`Delete category ${category.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start">
        <FormField label="New category name" htmlFor="category-name" error={errors.name?.message}>
          <input id="category-name" className={`input ${errors.name ? "input-error" : ""}`} placeholder="e.g. Laboratory Tools" {...register("name")} />
        </FormField>
        <FormField label="Loan days" htmlFor="category-days" error={errors.maxLoanDays?.message}>
          <input id="category-days" type="number" className={`input ${errors.maxLoanDays ? "input-error" : ""}`} {...register("maxLoanDays", { valueAsNumber: true })} />
        </FormField>
        <FormField label="Daily fee (₱)" htmlFor="category-fee" error={errors.dailyFee?.message}>
          <input id="category-fee" type="number" step="0.01" className={`input ${errors.dailyFee ? "input-error" : ""}`} {...register("dailyFee", { valueAsNumber: true })} />
        </FormField>
        <button type="submit" className="btn-primary sm:mt-[26px]" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add category"}
        </button>
      </form>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete category?"
        message={`"${toDelete?.name}" will be removed. A category that still has equipment cannot be deleted.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
