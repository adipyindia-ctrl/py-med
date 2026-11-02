'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Heart, Loader2, AlertCircle } from 'lucide-react';

type ConfirmState = 'loading' | 'ok' | 'already_processed' | 'pending' | 'error';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const linkId = searchParams.get('link_id');
  const [state, setState] = useState<ConfirmState>('loading');
  const called = useRef(false);

  useEffect(() => {
    // Guard: only call once even in React StrictMode double-effect
    if (called.current) return;
    called.current = true;

    if (!linkId) {
      setState('error');
      return;
    }

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: linkId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          console.error('[PaymentSuccess] confirm failed:', json);
          setState('error');
        } else {
          setState(json.status as ConfirmState);
        }
      })
      .catch((err) => {
        console.error('[PaymentSuccess] confirm error:', err);
        setState('error');
      });
  }, [linkId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm text-center">

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          {state === 'loading' ? (
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          ) : state === 'error' ? (
            <AlertCircle className="h-10 w-10 text-red-500" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          )}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900">
          {state === 'loading' && 'Confirming Payment...'}
          {(state === 'ok' || state === 'already_processed') && 'Payment Successful!'}
          {state === 'pending' && 'Payment Pending'}
          {state === 'error' && 'Something went wrong'}
        </h1>

        {/* Body */}
        <p className="mt-3 text-gray-600">
          {state === 'loading' &&
            'Please wait — we are confirming your payment and notifying your doctor.'}
          {state === 'ok' &&
            'Your consultation fee has been received. Our doctor will review your case shortly.'}
          {state === 'already_processed' &&
            'Your payment was already confirmed. Our doctor will review your case shortly.'}
          {state === 'pending' &&
            'Your payment is still being processed. Please wait a moment and check your WhatsApp for confirmation.'}
          {state === 'error' &&
            'We could not confirm your payment automatically. Please contact support and share your payment details.'}
        </p>

        {/* WhatsApp note */}
        {(state === 'ok' || state === 'already_processed') && (
          <p className="mt-2 text-sm text-gray-500">
            You will receive your prescription via WhatsApp once ready.
          </p>
        )}

        {/* WhatsApp confirmation sent badge */}
        {state === 'ok' && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200">
            <CheckCircle2 className="h-4 w-4" />
            Confirmation sent on WhatsApp
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Heart className="h-4 w-4 text-blue-500" />
          <span>MediVoice AI — Powered by AI</span>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
