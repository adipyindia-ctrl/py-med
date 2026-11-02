import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAppSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = getAppSettings();

    const recipient = body.recipient || settings.whatsappTestRecipient || process.env.WHATSAPP_TEST_RECIPIENT;
    const token = body.whatsappAccessToken || settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = body.whatsappPhoneNumberId || settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required (e.g., 919876543210)' },
        { status: 400 },
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp Access Token is missing' },
        { status: 400 },
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp Phone Number ID is missing' },
        { status: 400 },
      );
    }

    // Clean phone number (strip +, spaces, dashes)
    const cleanPhone = recipient.replace(/[^0-9]/g, '');

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: '🏥 *MediVoice AI Test Message*\n\n✅ Connection Successful!\nAapka WhatsApp Access Token sahi se configure ho gaya hai aur messages deliver ho rahe hain.',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: `Test message sent successfully to +${cleanPhone}!`,
      data: response.data,
    });
  } catch (error: unknown) {
    let errorMessage = 'Failed to send WhatsApp message';
    if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
      errorMessage = `Meta API Error: ${error.response.data.error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 },
    );
  }
}

