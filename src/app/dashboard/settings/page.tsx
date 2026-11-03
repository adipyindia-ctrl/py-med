'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Bot,
  CreditCard,
  Save,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [showToken, setShowToken] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showCashfreeSecret, setShowCashfreeSecret] = useState(false);

  const [form, setForm] = useState({
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappVerifyToken: '',
    whatsappTestRecipient: '',
    openaiApiKey: '',
    cashfreeAppId: '',
    cashfreeSecretKey: '',
    cashfreeEnv: 'sandbox',
    consultationFee: 300,
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setForm(data.settings);
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load current settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!form.whatsappAccessToken) {
      toast.error('Please enter WhatsApp Access Token first');
      return;
    }
    if (!form.whatsappPhoneNumberId) {
      toast.error('Please enter WhatsApp Phone Number ID first');
      return;
    }
    if (!form.whatsappTestRecipient) {
      toast.error('Please enter a recipient phone number to test');
      return;
    }

    setTestingWa(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappAccessToken: form.whatsappAccessToken,
          whatsappPhoneNumberId: form.whatsappPhoneNumberId,
          recipient: form.whatsappTestRecipient,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success('WhatsApp test message sent successfully!');
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send message' });
        toast.error(data.error || 'Test message failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to test WhatsApp';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestingWa(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Loading configurations...">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="System Settings"
      subtitle="Manage WhatsApp API tokens, OpenAI keys, and payment credentials"
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
        {/* WhatsApp Business API Card */}
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader className="bg-emerald-50/50 rounded-t-xl border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-emerald-950">WhatsApp Business API (Meta)</CardTitle>
                <CardDescription>
                  Configure WhatsApp credentials used for patient consultations & prescription delivery
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-emerald-600" />
                  WhatsApp Access Token (Permanent or 24-hr Token)
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showToken ? 'Hide Token' : 'Show Token'}
                </button>
              </div>
              <textarea
                value={form.whatsappAccessToken}
                onChange={(e) => handleChange('whatsappAccessToken', e.target.value)}
                placeholder="EAAMEMDOPCQwBS8..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-mono text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                style={{ WebkitTextSecurity: showToken ? 'none' : 'disc' } as React.CSSProperties}
              />
              <p className="mt-1 text-xs text-gray-500">
                Copy your token from Meta Developer Portal &gt; WhatsApp &gt; API Setup and paste it here.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number ID"
                value={form.whatsappPhoneNumberId}
                onChange={(e) => handleChange('whatsappPhoneNumberId', e.target.value)}
                placeholder="e.g. 116655001319676"
              />
              <Input
                label="Business Account ID"
                value={form.whatsappBusinessAccountId}
                onChange={(e) => handleChange('whatsappBusinessAccountId', e.target.value)}
                placeholder="e.g. 1045535468955334"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Webhook Verify Token"
                value={form.whatsappVerifyToken}
                onChange={(e) => handleChange('whatsappVerifyToken', e.target.value)}
                placeholder="PYINDIA"
              />
              <Input
                label="Default Test Recipient Phone Number"
                value={form.whatsappTestRecipient}
                onChange={(e) => handleChange('whatsappTestRecipient', e.target.value)}
                placeholder="e.g. 917355177189 (with country code)"
              />
            </div>

            {/* Test WhatsApp Connection Box */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 mt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Test WhatsApp Connection
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Send a test message to verify your access token is valid.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingWa}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs h-9 px-4 shrink-0"
                >
                  {testingWa ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {testingWa ? 'Testing Connection...' : 'Send Test WhatsApp Message'}
                </Button>
              </div>

              {testResult && (
                <div
                  className={`mt-3 flex items-start gap-2.5 rounded-lg p-3 text-xs ${
                    testResult.success
                      ? 'bg-green-100 text-green-900 border border-green-200'
                      : 'bg-red-100 text-red-900 border border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {testResult.success ? 'Success: ' : 'Failed: '}
                    </span>
                    {testResult.message}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OpenAI & AI Configuration Card */}
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="bg-blue-50/50 rounded-t-xl border-b border-blue-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-blue-950">AI & OpenAI Configuration</CardTitle>
                <CardDescription>
                  Whisper (Voice-to-Text), GPT-4o-mini (Medical Triage), and TTS (Text-to-Speech)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="relative">
              <Input
                type={showOpenAi ? 'text' : 'password'}
                label="OpenAI API Key"
                value={form.openaiApiKey}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                placeholder="sk-proj-..."
              />
              <button
                type="button"
                onClick={() => setShowOpenAi(!showOpenAi)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showOpenAi ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Cashfree Payment Gateway Card */}
        <Card className="border-indigo-200 shadow-sm">
          <CardHeader className="bg-indigo-50/50 rounded-t-xl border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-indigo-950">Cashfree Payment Gateway</CardTitle>
                <CardDescription>
                  Configure consultation fees and Cashfree payment keys
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cashfree App ID"
                value={form.cashfreeAppId}
                onChange={(e) => handleChange('cashfreeAppId', e.target.value)}
                placeholder="TEST1117..."
              />
              <div className="relative">
                <Input
                  type={showCashfreeSecret ? 'text' : 'password'}
                  label="Cashfree Secret Key"
                  value={form.cashfreeSecretKey}
                  onChange={(e) => handleChange('cashfreeSecretKey', e.target.value)}
                  placeholder="cfsk_ma_..."
                />
                <button
                  type="button"
                  onClick={() => setShowCashfreeSecret(!showCashfreeSecret)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showCashfreeSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Environment
                </label>
                <select
                  value={form.cashfreeEnv}
                  onChange={(e) => handleChange('cashfreeEnv', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
              <Input
                type="number"
                label="Consultation Fee (INR ₹)"
                value={form.consultationFee}
                onChange={(e) => handleChange('consultationFee', Number(e.target.value))}
                placeholder="300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8"
          >
            {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'Saving Settings...' : 'Save All Settings'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}

