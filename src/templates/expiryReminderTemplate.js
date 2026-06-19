const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getDaysLeft = (expiryDate) => {
  const diffMs = new Date(expiryDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / DAY_IN_MS));
};

const toDisplayDate = (dateValue) => {
  return new Date(dateValue).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getCategoryBadge = (category) => {
  if (category === 'domain') {
    return '<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e8f2ff;color:#0a56a8;font-size:12px;font-weight:700;">DOMAIN</span>';
  }

  return '<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#e9f9ef;color:#0b7a3f;font-size:12px;font-weight:700;">HOSTING</span>';
};

const buildExpiryReminderHtml = (credentials) => {
  const rows = credentials
    .map((item) => {
      const expiryText = toDisplayDate(item.expiryDate);
      const daysLeft = getDaysLeft(item.expiryDate);
      const urgencyColor = daysLeft <= 7 ? '#c62828' : '#d97706';

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #eef2f7;">${getCategoryBadge(item.category)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #eef2f7;font-weight:600;color:#1e293b;">${item.name}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #eef2f7;color:#334155;">${expiryText}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #eef2f7;color:${urgencyColor};font-weight:700;">${daysLeft} day(s)</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="margin:0;padding:24px 0;background:#f4f7fb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#0f172a;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5eaf2;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
        <div style="padding:24px 28px;background:linear-gradient(120deg,#0f4c81,#1f7a8c 58%,#2ea2a2);color:#ffffff;">
          <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.7px;opacity:0.9;">CREDENTIALS MANAGEMENT</p>
          <h2 style="margin:0;font-size:26px;line-height:1.25;">Domain & Hosting Expiry Alert</h2>
          <p style="margin:10px 0 0 0;font-size:14px;opacity:0.95;">Summary of services expiring within the next 30 days.</p>
        </div>

        <div style="padding:22px 28px 8px 28px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">
            A total of <strong>${credentials.length}</strong> credential(s) require renewal action. Please complete renewals before the expiry date to avoid service disruption.
          </p>
        </div>

        <div style="padding:10px 18px 24px 18px;">
          <table style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e6ecf4;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;color:#475569;">
                <th style="text-align:left;padding:12px;border-bottom:1px solid #e6ecf4;font-size:13px;letter-spacing:0.4px;">Type</th>
                <th style="text-align:left;padding:12px;border-bottom:1px solid #e6ecf4;font-size:13px;letter-spacing:0.4px;">Credential Name</th>
                <th style="text-align:left;padding:12px;border-bottom:1px solid #e6ecf4;font-size:13px;letter-spacing:0.4px;">Expiry Date</th>
                <th style="text-align:left;padding:12px;border-bottom:1px solid #e6ecf4;font-size:13px;letter-spacing:0.4px;">Days Left</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>

        
      </div>
    </div>
  `;
};

module.exports = {
  buildExpiryReminderHtml,
  getDaysLeft,
};