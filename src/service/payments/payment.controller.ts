import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePaymentDto, YooNotificationDto } from './payment.dto';
import { PaymentService } from './payment.service';
import { EventEmitter } from 'events';
import { PaymentEventBus } from '../../main';
@Controller('payments')
export class PaymentController {
  constructor(private readonly yoo: PaymentService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.yoo.createPayment(dto);
  }

  @Get('yookassa/:id')
  getOne(@Param('id') id: string) {
    return this.yoo.getPayment(id);
  }

  @Post('yookassa/:id/capture')
  capture(@Param('id') id: string, @Body() body: { value: string; currency: string; metadata?: any }) {
    return this.yoo.capturePayment(id, { value: body.value, currency: body.currency }, body.metadata);
  }
  @Post("webhook/yookassa")
  async yookassaWebhook(@Body() body: YooNotificationDto) {
    PaymentEventBus.emit(`payment_${body.object.id}`, body);
    return { status: 'ok' };
  }
}
