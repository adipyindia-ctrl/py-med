'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, FileText, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const medicineSchema = z.object({
  name: z.string().min(1, 'Required'),
  dosage: z.string().min(1, 'Required'),
  frequency: z.string().min(1, 'Required'),
  duration: z.string().min(1, 'Required'),
  instructions: z.string().optional(),
});

const formSchema = z.object({
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  medicines: z.array(medicineSchema).min(1, 'Add at least one medicine'),
  investigations: z.string().optional(),
  followUpInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PrescriptionFormProps {
  consultationId: string;
  patientName: string;
  aiSummary?: string | null;
  symptoms?: string[];
}

export function PrescriptionForm({
  consultationId,
  patientName,
  aiSummary,
  symptoms = [],
}: PrescriptionFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'medicines' });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        consultationId,
        diagnosis: data.diagnosis,
        medicines: data.medicines,
        investigations: data.investigations
          ? data.investigations.split('\n').filter(Boolean)
          : [],
        followUpInstructions: data.followUpInstructions,
        followUpDate: data.followUpDate,
        notes: data.notes,
      };

      const res = await fetch('/api/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create prescription');

      toast.success('Prescription sent to patient via WhatsApp!');
      router.push('/dashboard/consultations');
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* AI Summary */}
      {aiSummary && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
              AI Clinical Summary
            </p>
            <p className="text-sm text-blue-900">{aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s, i) => (
            <span key={i} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 border border-orange-100">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Diagnosis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter primary diagnosis..."
            error={errors.diagnosis?.message}
            {...register('diagnosis')}
          />
        </CardContent>
      </Card>

      {/* Medicines */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Medicines</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })}
            >
              <Plus size={14} />
              Add Medicine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="relative rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="absolute right-3 top-3">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove medicine"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <p className="mb-3 text-xs font-semibold text-gray-500 uppercase">Medicine #{index + 1}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Medicine Name"
                    placeholder="e.g., Paracetamol 500mg"
                    error={errors.medicines?.[index]?.name?.message}
                    {...register(`medicines.${index}.name`)}
                  />
                </div>
                <Input
                  label="Dosage"
                  placeholder="e.g., 500mg"
                  error={errors.medicines?.[index]?.dosage?.message}
                  {...register(`medicines.${index}.dosage`)}
                />
                <Input
                  label="Frequency"
                  placeholder="e.g., Twice daily"
                  error={errors.medicines?.[index]?.frequency?.message}
                  {...register(`medicines.${index}.frequency`)}
                />
                <Input
                  label="Duration"
                  placeholder="e.g., 5 days"
                  error={errors.medicines?.[index]?.duration?.message}
                  {...register(`medicines.${index}.duration`)}
                />
                <Input
                  label="Instructions"
                  placeholder="e.g., After meals"
                  {...register(`medicines.${index}.instructions`)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Investigations & Follow-up */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Investigations & Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Investigations (one per line)"
            placeholder="CBC&#10;Blood Sugar Fasting&#10;Chest X-Ray"
            rows={3}
            {...register('investigations')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Follow-up Date"
              {...register('followUpDate')}
            />
            <Input
              label="Follow-up Instructions"
              placeholder="e.g., Review after 5 days"
              {...register('followUpInstructions')}
            />
          </div>
          <Textarea
            label="Additional Notes"
            placeholder="Any special instructions..."
            rows={2}
            {...register('notes')}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className="gap-2">
          <Send size={16} />
          Approve & Send Prescription
        </Button>
      </div>
    </form>
  );
}
