"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api/client";

const fieldClasses =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400 focus-visible:ring-3 focus-visible:ring-sky-100";

const EMPTY = {
  contactName: "",
  email: "",
  phone: "",
  source: "web",
  rawText: "",
};

/**
 * Log an enquiry received by phone, email or the website. It is triaged
 * as soon as it is saved, then handled from the inbox like any other.
 */
export function NewEnquiryDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const busy = isSaving || isRefreshing;

  const update =
    (field: keyof typeof EMPTY) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const result = await apiFetch<{ id: string; triaged: boolean }>(
        "/api/enquiries",
        { method: "POST", body: JSON.stringify(form) },
      );
      toast.success(
        result.triaged
          ? "Enquiry added and triaged"
          : "Enquiry added. Triage it from the inbox.",
      );
      setForm(EMPTY);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save enquiry",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New enquiry
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>New enquiry</DialogTitle>
              <DialogDescription>
                Log an enquiry from a customer. It is triaged as soon as it is
                saved; nothing is sent to the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Name
                <input
                  required
                  value={form.contactName}
                  onChange={update("contactName")}
                  autoComplete="off"
                  className={fieldClasses}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="off"
                  className={fieldClasses}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Phone
                <input
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  autoComplete="off"
                  className={fieldClasses}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Received via
                <select
                  value={form.source}
                  onChange={update("source")}
                  className={fieldClasses}
                >
                  <option value="web">Website</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Message
                <Textarea
                  required
                  rows={5}
                  value={form.rawText}
                  onChange={update("rawText")}
                  placeholder="e.g. Hi, could I view 12A Baker Street on Friday?"
                />
              </label>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving..." : "Save and triage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
