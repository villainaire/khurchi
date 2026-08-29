// worker/email.ts
import type { Env, BookingResponse } from "./types";

export interface SendBookingEmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

export async function sendBookingNotificationEmail(
  booking: BookingResponse,
  env: Env
): Promise<SendBookingEmailResult> {
  const apiKey = env.RESEND_API_KEY;
  const recipient = env.NOTIFICATION_EMAIL || "akashkamble.jb007@gmail.com";
  const businessFrom = env.BUSINESS_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured; skipping email dispatch.");
    return {
      sent: false,
      error: "RESEND_API_KEY not configured",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F6F0; margin: 0; padding: 20px; color: #1A2B22; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E2DCD0; overflow: hidden; }
          .header { background: #2C4C3B; color: #F9F6F0; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
          .badge { display: inline-block; background: #C48B47; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 14px; margin-top: 10px; }
          .body { padding: 24px; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .info-table td { padding: 10px 12px; border-bottom: 1px solid #F0ECE1; font-size: 14px; }
          .info-table td.label { font-weight: 600; color: #596A60; width: 38%; }
          .info-table td.value { font-weight: 500; color: #1A2B22; }
          .issue-box { background: #F9F6F0; border-left: 4px solid #C48B47; padding: 14px; margin-top: 18px; border-radius: 4px; font-size: 14px; }
          .footer { background: #F0ECE1; padding: 16px; text-align: center; font-size: 12px; color: #596A60; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Chair Repair Request</h1>
            <div class="badge">Job: ${booking.job_number}</div>
          </div>
          <div class="body">
            <p style="margin: 0 0 16px; font-size: 15px;">A new service request has been logged on <strong>Khurchi.com</strong> Mumbai Chair Care Network:</p>
            <table class="info-table">
              <tr>
                <td class="label">Job Number</td>
                <td class="value"><strong>${booking.job_number}</strong></td>
              </tr>
              <tr>
                <td class="label">Customer Name</td>
                <td class="value"><strong>${booking.customer_name}</strong></td>
              </tr>
              <tr>
                <td class="label">Mobile Number</td>
                <td class="value"><a href="tel:${booking.customer_phone}">${booking.customer_phone}</a></td>
              </tr>
              <tr>
                <td class="label">Customer Email</td>
                <td class="value">${booking.customer_email ? `<a href="mailto:${booking.customer_email}">${booking.customer_email}</a>` : "Not provided"}</td>
              </tr>
              <tr>
                <td class="label">Chair Type</td>
                <td class="value"><strong>${booking.chair_type}</strong></td>
              </tr>
              <tr>
                <td class="label">Service Area</td>
                <td class="value">${booking.service_area}</td>
              </tr>
              <tr>
                <td class="label">Complete Address</td>
                <td class="value">${booking.address}</td>
              </tr>
              <tr>
                <td class="label">Preferred Slot</td>
                <td class="value">${booking.preferred_date} (${booking.preferred_time})</td>
              </tr>
              <tr>
                <td class="label">Booking Timestamp</td>
                <td class="value">${new Date(booking.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
              </tr>
              <tr>
                <td class="label">Issue Tags</td>
                <td class="value">${booking.issue_tags && booking.issue_tags.length > 0 ? booking.issue_tags.join(", ") : "Standard diagnosis"}</td>
              </tr>
            </table>

            <div class="issue-box">
              <strong>Customer Problem Description:</strong><br/>
              ${booking.issue_description}
            </div>
          </div>
          <div class="footer">
            Khurchi.com Chair Care Network • Mumbai, Thane & Navi Mumbai
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
NEW CHAIR REPAIR BOOKING: ${booking.job_number}
-----------------------------------------------
Customer Name: ${booking.customer_name}
Mobile Number: ${booking.customer_phone}
Customer Email: ${booking.customer_email || "N/A"}
Chair Type: ${booking.chair_type}
Service Area: ${booking.service_area}
Complete Address: ${booking.address}
Preferred Date & Time: ${booking.preferred_date} (${booking.preferred_time})
Issue Description: ${booking.issue_description}
Issue Tags: ${booking.issue_tags.join(", ")}
Booking Timestamp: ${booking.created_at}
Job Number: ${booking.job_number}
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: businessFrom.includes("<") ? businessFrom : `Khurchi Bookings <${businessFrom}>`,
        to: [recipient],
        subject: `New Booking [${booking.job_number}] - ${booking.customer_name} (${booking.chair_type})`,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API failed with status ${response.status}: ${errorText}`);
      return {
        sent: false,
        error: `Resend error: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      sent: true,
      messageId: data.id,
    };
  } catch (err: any) {
    console.error("Failed to send booking email via Resend:", err);
    return {
      sent: false,
      error: err?.message || "Network exception during Resend call",
    };
  }
}
