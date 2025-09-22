import { Body, Controller, Post } from '@nestjs/common';
import {YooNotificationDto } from './payment.dto';
import { PaymentService } from './payment.service';
import { PaymentEventBus } from '../main';
@Controller('payments')
export class PaymentController {
  constructor(private readonly yoo: PaymentService) {}

  @Post("webhook/yookassa")
  async yookassaWebhook(@Body() body: YooNotificationDto) {
    PaymentEventBus.emit(`payment_${body.object.id}`, body);
    return { status: 'ok' };
  }
}
