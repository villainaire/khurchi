// worker/email.ts
import type { BookingRecord, BookingPhotoPayload, Env } from "./types";

interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send internal booking notification email using Resend API from Cloudflare Worker
 */
export async function sendBookingNotificationEmail(
  booking: BookingRecord,
  env: Env,
  photos?: BookingPhotoPayload[]
): Promise<EmailResult> {
  const apiKey = env.RESEND_API_KEY;
  const recipientEmail = env.NOTIFICATION_EMAIL || "akashkamble.jb007@gmail.com";
  const businessEmail = env.BUSINESS_EMAIL || "info@khurchi.com";

  if (!apiKey) {
    const msg = "RESEND_API_KEY is not configured in Cloudflare environment. Email delivery skipped.";
    console.warn(msg);
    return { sent: false, error: msg };
  }

  const subject = `New Chair Repair Request #${booking.job_number} — ${booking.customer_name} (${booking.service_area})`;

  const tagsHtml =
    booking.issue_tags && booking.issue_tags.length > 0
      ? booking.issue_tags
          .map(
            (t) =>
              `<span style="display:inline-block;background:#F1EFEA;color:#1B2E24;padding:4px 10px;border-radius:12px;font-size:12px;margin-right:6px;margin-bottom:6px;border:1px solid #E2DED4;">${t}</span>`
          )
          .join("")
      : "<em>None specified</em>";

  const photosNote =
    photos && photos.length > 0
      ? `<div style="margin-top:16px;padding:12px;background:#eef7f2;border-left:4px solid #1B2E24;border-radius:4px;">
          <strong>Attached Photos:</strong> ${photos.length} chair photo(s) attached to this email.
         </div>`
      : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1B2E24; background-color: #F8F6F0; margin: 0; padding: 20px; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #E2DED4; border-radius: 16px; overflow: hidden; }
    .header { background: #1B2E24; color: #F8F6F0; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #C5A880; text-transform: uppercase; letter-spacing: 1px; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #C5A880; color: #1B2E24; font-weight: bold; font-size: 13px; padding: 4px 12px; border-radius: 20px; }
    table.details { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    table.details th { text-align: left; padding: 10px 12px; background: #F8F6F0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E2DED4; width: 35%; }
    table.details td { padding: 10px 12px; border-bottom: 1px solid #E2DED4; color: #1B2E24; }
    .footer { padding: 20px 32px; background: #F8F6F0; border-top: 1px solid #E2DED4; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p>Khurchi.com Service Notification</p>
      <h1>New Chair Repair Request</h1>
    </div>
    <div class="body">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:12px; text-transform:uppercase; color:#64748b; letter-spacing:1px;">Job Number</span>
          <div style="font-size:24px; font-weight:bold; color:#1B2E24; margin-top:2px;">${booking.job_number}</div>
        </div>
        <div>
          <span class="badge">${booking.status}</span>
        </div>
      </div>

      <table class="details">
        <tr>
          <th>Customer Name</th>
          <td><strong>${booking.customer_name}</strong></td>
        </tr>
        <tr>
          <th>Mobile Number</th>
          <td><a href="tel:${booking.customer_phone}" style="color:#1B2E24; text-decoration:underline;">${booking.customer_phone}</a></td>
        </tr>
        <tr>
          <th>Email</th>
          <td>${booking.customer_email ? `<a href="mailto:${booking.customer_email}">${booking.customer_email}</a>` : "<em>Not provided</em>"}</td>
        </tr>
        <tr>
          <th>Chair Type</th>
          <td><strong>${booking.chair_type}</strong></td>
        </tr>
        <tr>
          <th>Diagnostic Tags</th>
          <td>${tagsHtml}</td>
        </tr>
        <tr>
          <th>Issue Description</th>
          <td>${booking.issue_description}</td>
        </tr>
        <tr>
          <th>Service Area</th>
          <td><strong>${booking.service_area}</strong></td>
        </tr>
        <tr>
          <th>Full Address</th>
          <td>${booking.address}</td>
        </tr>
        <tr>
          <th>Preferred Slot</th>
          <td><strong>${booking.preferred_date}</strong> (${booking.preferred_time})</td>
        </tr>
        <tr>
          <th>Received At</th>
          <td>${new Date(booking.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
        </tr>
      </table>

      ${photosNote}
    </div>
    <div class="footer">
      Khurchi.com • Chair Care Network (Mumbai, Thane & Navi Mumbai) • ${businessEmail}
    </div>
  </div>
</body>
</html>
`;

  // Format attachments for Resend API
  const attachments: Array<{ filename: string; content: string }> = [];
  if (photos && Array.isArray(photos)) {
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p && p.base64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = p.base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        attachments.push({
          filename: p.filename || `chair_photo_${i + 1}.jpg`,
          content: cleanBase64,
        });
      }
    }
  }

  try {
    const payload: any = {
      from: "Khurchi Bookings <onboarding@resend.dev>",
      to: [recipientEmail],
      reply_to: booking.customer_email || businessEmail,
      subject,
      html,
    };

    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API failed with HTTP ${response.status}:`, errorText);
      return {
        sent: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data: any = await response.json();
    return {
      sent: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    console.error("Resend API request exception:", err);
    return {
      sent: false,
      error: err?.message || String(err),
    };
  }
}
