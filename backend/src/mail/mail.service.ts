import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT')) || 587,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
    const addr = this.config.get<string>('SMTP_FROM_ADDRESS') || 'noreply@example.com';
    const name = this.config.get<string>('SMTP_FROM_NAME') || 'LIVE';
    this.from = `${name} <${addr}>`;
  }

  async sendVerifyEmail(to: string, verifyUrl: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: '【LIVE】请验证您的邮箱',
      html: `<p>欢迎注册 LIVE。</p><p>请点击下方链接验证您的邮箱（24小时内有效）：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: '【LIVE】重置您的密码',
      html: `<p>我们收到了您的密码重置请求。</p><p>请点击下方链接重置密码（1小时内有效）：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>如非本人操作，请忽略本邮件。</p>`,
    });
  }

  async sendLiveNotification(
    to: string,
    streamTitle: string,
    watchUrl: string,
    unsubscribeUrl: string,
  ) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `【LIVE】开播啦：${streamTitle}`,
      html: `<p>您关注的 <strong>${streamTitle}</strong> 已经开播！</p><p><a href="${watchUrl}">点此观看</a></p><hr><p>不再接收通知？<a href="${unsubscribeUrl}">取消订阅</a></p>`,
    });
  }

  async sendManyLiveNotifications(
    recipients: { email: string; token: string }[],
    streamTitle: string,
    watchUrl: string,
    unsubscribeBase: string,
  ) {
    for (const r of recipients) {
      try {
        const url = `${unsubscribeBase}?email=${encodeURIComponent(r.email)}&token=${r.token}`;
        await this.sendLiveNotification(r.email, streamTitle, watchUrl, url);
        await new Promise((res) => setTimeout(res, 200));
      } catch (e) {
        this.log.error(`Failed to email ${r.email}: ${(e as Error).message}`);
      }
    }
  }
}
