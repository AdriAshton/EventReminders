require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const nodemailer = require('nodemailer');

async function run() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT || 2525),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@example.com',
      to: process.env.TEST_EMAIL || 'you@example.com',
      subject: 'Mailtrap test',
      text: 'This is a test',
      html: '<b>This is a test</b>',
    });
    console.log('Sent:', info);
  } catch (e) {
    console.error('Send failed:', e);
  }
}

run();
