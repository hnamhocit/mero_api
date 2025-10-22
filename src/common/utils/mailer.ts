import * as nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  templateName: string;
  args?: any;
}

export async function sendMail({
  to,
  subject,
  templateName,
  args,
}: MailOptions) {
  try {
    const template = await fs.readFile(
      path.resolve(__dirname, '../templates', `${templateName}.ejs`),
      'utf8',
    );
    const html = ejs.render(template, args);

    await transporter.sendMail({
      from: `"HNCHAT" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send email:', JSON.stringify(err));
  }
}
