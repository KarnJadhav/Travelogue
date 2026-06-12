const nodemailer = require('nodemailer');

function getEmailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();
  const service = process.env.EMAIL_SERVICE?.trim() || 'gmail';
  const from = process.env.EMAIL_FROM?.trim() || user;

  return { user, pass, service, from };
}

async function sendEmail(to, subject, text, options = {}) {
  const { user, pass, service, from } = getEmailConfig();

  if (!user || !pass) {
    const context = options.context ? `${options.context}: ` : '';
    console.warn(`${context}email skipped because EMAIL_USER or EMAIL_PASS is missing.`);
    return { skipped: true, reason: 'missing_credentials' };
  }

  const transporter = nodemailer.createTransport({
    service,
    auth: { user, pass }
  });

  await transporter.sendMail({ from, to, subject, text });
  return { skipped: false };
}

module.exports = { sendEmail };
