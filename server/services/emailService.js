const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});

const sendInvoiceEmail = async ({ to, invoice, settings }) => {
    const companyName = settings?.companyName || 'Scientific Solutions';
    const subject     = `Invoice #${invoice.invoiceNumber} from ${companyName}`;

    const itemRows = invoice.items.map(item => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.description || 'Item'}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(item.unitPrice).toFixed(2)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${Number(item.totalPrice).toFixed(2)}</td>
        </tr>`).join('');

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#112244;color:#fff;padding:24px;">
            <h1 style="margin:0;font-size:24px;">${companyName}</h1>
            <p style="margin:4px 0 0;opacity:0.7;font-size:14px;">Advanced Engineering &amp; ERP</p>
        </div>
        <div style="padding:24px;">
            <h2 style="color:#112244;margin:0 0 16px;">Invoice #${invoice.invoiceNumber}</h2>
            <table style="width:100%;margin-bottom:16px;font-size:14px;">
                <tr><td style="color:#6b7280;">Invoice Date:</td><td><b>${new Date(invoice.date).toLocaleDateString()}</b></td></tr>
                ${invoice.dueDate ? `<tr><td style="color:#6b7280;">Due Date:</td><td><b>${new Date(invoice.dueDate).toLocaleDateString()}</b></td></tr>` : ''}
                <tr><td style="color:#6b7280;">Client:</td><td><b>${invoice.company?.name || ''}</b></td></tr>
                <tr><td style="color:#6b7280;">Status:</td><td><b>${invoice.status}</b></td></tr>
            </table>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
                <thead>
                    <tr style="background:#f3f4f6;">
                        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Description</th>
                        <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;">Qty</th>
                        <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb;">Unit Price</th>
                        <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>

            <div style="text-align:right;font-size:14px;">
                <div style="margin-bottom:4px;color:#6b7280;">Total: <b style="color:#112244;">₹${Number(invoice.totalAmount).toFixed(2)}</b></div>
            </div>

            ${invoice.notes ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;font-size:13px;color:#374151;"><b>Notes:</b><br>${invoice.notes}</div>` : ''}

            <p style="margin-top:24px;font-size:13px;color:#6b7280;">
                Please make payment by the due date. For questions contact us at ${process.env.SMTP_FROM || 'billing@scientificsolutions.com'}.
            </p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
            &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </div>
    </div>`;

    await transporter.sendMail({
        from:    `"${companyName}" <${process.env.SMTP_FROM || 'noreply@scientificsolutions.com'}>`,
        to,
        subject,
        html,
    });
};

const sendPaymentReminder = async ({ to, invoice, settings }) => {
    const companyName = settings?.companyName || 'Scientific Solutions';
    const overdueDays = invoice.dueDate
        ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)
        : 0;

    const subject = `Payment Reminder: Invoice #${invoice.invoiceNumber}${overdueDays > 0 ? ` (${overdueDays} days overdue)` : ''}`;

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#dc2626;color:#fff;padding:24px;">
            <h1 style="margin:0;font-size:20px;">Payment Reminder</h1>
            <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${companyName}</p>
        </div>
        <div style="padding:24px;">
            <p style="font-size:15px;color:#1f2937;">Dear <b>${invoice.company?.name || 'Valued Client'}</b>,</p>
            <p style="color:#374151;">This is a reminder that invoice <b>#${invoice.invoiceNumber}</b> for <b>₹${Number(invoice.totalAmount).toFixed(2)}</b> is ${overdueDays > 0 ? `<span style="color:#dc2626;font-weight:bold;">${overdueDays} days overdue</span>` : 'due soon'}.
            ${invoice.dueDate ? `The due date was <b>${new Date(invoice.dueDate).toLocaleDateString()}</b>.` : ''}</p>
            <p style="color:#374151;">Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.</p>
            <p style="margin-top:24px;font-size:13px;color:#6b7280;">
                For questions, please contact ${process.env.SMTP_FROM || 'billing@scientificsolutions.com'}.
            </p>
        </div>
    </div>`;

    await transporter.sendMail({
        from:    `"${companyName}" <${process.env.SMTP_FROM || 'noreply@scientificsolutions.com'}>`,
        to,
        subject,
        html,
    });
};

module.exports = { sendInvoiceEmail, sendPaymentReminder };
