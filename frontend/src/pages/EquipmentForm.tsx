import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { equipmentSchema } from "../schemas/equipmentSchema";
import type { EquipmentFormValues } from "../schemas/equipmentSchema";
import type { Category, Equipment } from "../types";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";

// Page 5: one form used both to add a new item and to edit an existing one.
export default function EquipmentForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const categories = useFetch<Category[]>("/categories");
  const existing = useFetch<Equipment>(isEditing ? `/equipment/${id}` : null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: "",
      category: "",
      type: "non-consumable",
      totalQuantity: 1,
      reorderLevel: 0,
      replacementCost: 0,
      costPerUnit: 0,
      condition: "good",
      damageNotes: "",
    },
  });

  // When editing, fill the form once the item and the categories have loaded.
  useEffect(() => {
    if (existing.data && categories.data) {
      reset({
        name: existing.data.name,
        category: existing.data.category?._id ?? "",
        type: existing.data.type,
        totalQuantity: existing.data.totalQuantity,
        reorderLevel: existing.data.reorderLevel,
        replacementCost: existing.data.replacementCost,
        costPerUnit: existing.data.costPerUnit ?? 0,
        condition: existing.data.condition,
        damageNotes: existing.data.damageNotes ?? "",
      });
    }
  }, [existing.data, categories.data, reset]);

  const isConsumable = watch("type") === "consumable";
  const isDamaged = !isConsumable && watch("condition") === "damaged";

  async function onSubmit(formValues: EquipmentFormValues) {
    // Consumables are always brand new, and notes only apply to damaged items.
    const values: EquipmentFormValues = {
      ...formValues,
      condition: isConsumable ? "good" : formValues.condition,
      damageNotes: isDamaged ? formValues.damageNotes : "",
    };
    try {
      if (isEditing) {
        await api.put(`/equipment/${id}`, values);
        showToast(`${values.name} updated`);
        navigate(`/equipment/${id}`);
      } else {
        const response = await api.post<Equipment>("/equipment", values);
        showToast(`${values.name} added`);
        navigate(`/equipment/${response.data._id}`);
      }
    } catch (error) {
      // Show the server's message at the top of the form.
      setError("root", { message: getErrorMessage(error) });
    }
  }

  if (categories.loading || existing.loading) return <Loading label="Loading form..." />;
  if (categories.error) return <ErrorMessage message={categories.error} onRetry={categories.refetch} />;
  if (existing.error) return <ErrorMessage message={existing.error} onRetry={existing.refetch} />;

  return (
    <>
      <PageHeader
        title={isEditing ? "Edit equipment" : "Add equipment"}
        subtitle={isEditing ? "Change the details of this item" : "Register a new item in the inventory"}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mx-auto max-w-2xl">
        {errors.root && (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
            {errors.root.message}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Name" htmlFor="name" error={errors.name?.message}>
              <input id="name" className={`input ${errors.name ? "input-error" : ""}`} placeholder="e.g. Scientific Calculator" {...register("name")} />
            </FormField>
          </div>

          <FormField label="Category" htmlFor="category" error={errors.category?.message}>
            <select id="category" className={`input ${errors.category ? "input-error" : ""}`} {...register("category")}>
              <option value="">Select a category</option>
              {(categories.data ?? []).map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Type"
            htmlFor="type"
            error={errors.type?.message}
            hint={
              isConsumable
                ? "Bought with cash and used up (paper, glue, tape). Always brand new, so it has no condition."
                : "Borrowed and returned (ruler, calculator)"
            }
          >
            <select id="type" className={`input ${errors.type ? "input-error" : ""}`} {...register("type")}>
              <option value="non-consumable">Non-consumable</option>
              <option value="consumable">Consumable</option>
            </select>
          </FormField>

          <FormField label={isConsumable ? "Quantity in stock" : "Total quantity"} htmlFor="totalQuantity" error={errors.totalQuantity?.message}>
            <input id="totalQuantity" type="number" className={`input ${errors.totalQuantity ? "input-error" : ""}`} {...register("totalQuantity", { valueAsNumber: true })} />
          </FormField>

          {/* Each type has extra fields that only apply to it. */}
          {isConsumable ? (
            <>
              {/* Consumables: price and restocking. No condition, they are always brand new. */}
              <FormField label="Cost per unit (₱)" htmlFor="costPerUnit" error={errors.costPerUnit?.message} hint="What a student pays in cash for one unit">
                <input id="costPerUnit" type="number" min={0} step="0.01" className={`input ${errors.costPerUnit ? "input-error" : ""}`} {...register("costPerUnit", { valueAsNumber: true })} />
              </FormField>
              <FormField label="Reorder level" htmlFor="reorderLevel" error={errors.reorderLevel?.message} hint="Flagged as low stock at or below this number">
                <input id="reorderLevel" type="number" className={`input ${errors.reorderLevel ? "input-error" : ""}`} {...register("reorderLevel", { valueAsNumber: true })} />
              </FormField>
            </>
          ) : (
            <>
              {/* Non-consumables: condition, damage notes when damaged, and replacement cost. */}
              <FormField label="Condition" htmlFor="condition" error={errors.condition?.message} hint="Only items in good condition can be borrowed">
                <select id="condition" className={`input ${errors.condition ? "input-error" : ""}`} {...register("condition")}>
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="retired">Retired</option>
                </select>
              </FormField>

              {isDamaged && (
                <div className="sm:col-span-2">
                  <FormField label="Damage notes" htmlFor="damageNotes" error={errors.damageNotes?.message} hint="What is damaged, so the next person checking it knows">
                    <textarea
                      id="damageNotes"
                      rows={3}
                      maxLength={300}
                      className={`input ${errors.damageNotes ? "input-error" : ""}`}
                      placeholder="e.g. Cracked screen and the power button sticks"
                      {...register("damageNotes")}
                    />
                  </FormField>
                </div>
              )}

              <FormField label="Replacement cost (₱)" htmlFor="replacementCost" error={errors.replacementCost?.message} hint="The overdue fee never exceeds this. Use 0 for no limit">
                <input id="replacementCost" type="number" step="0.01" className={`input ${errors.replacementCost ? "input-error" : ""}`} {...register("replacementCost", { valueAsNumber: true })} />
              </FormField>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={isEditing ? `/equipment/${id}` : "/equipment"} className="btn-outline">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add equipment"}
          </button>
        </div>
      </form>
    </>
  );
}
