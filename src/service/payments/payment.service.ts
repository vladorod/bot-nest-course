
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import axios, { Axios } from 'axios';
import * as process from 'process';
import { CreatePaymentDto } from './payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  public agent: Axios
  constructor(private readonly prismaService: PrismaService)  {
    this.agent = axios.create({
      baseURL: 'https://api.yookassa.ru/v3',
      auth: {
        username: process.env.YKASS_SHOP_ID,
        password: process.env.YKASSA_TOKEN
      },
      headers: { 'Content-Type': 'application/json' },
    });
  }


  async createPayment(dto: CreatePaymentDto) {
    const idempotenceKey = uuidv4();
    try {
      const { data } = await this.agent.post('/payments', dto, {
        headers: { 'Idempotence-Key': idempotenceKey },
      });
      return data; // вернёт объект платежа с confirmation_url
    } catch (e) {
      console.log(e);
    }

  }

  async getPayment(paymentId: string) {
    const { data } = await this.agent.get(`/payments/${paymentId}`);
    return data;
  }

  async capturePayment(paymentId: string, amount: { value: string; currency: string }, metadata?: any) {
    const idempotenceKey = uuidv4();
    const { data } = await this.agent.post(
      `/payments/${paymentId}/capture`,
      { amount, metadata },
      { headers: { 'Idempotence-Key': idempotenceKey } },
    );
    return data;
  }

  async cancelPayment(paymentId: string) {
    const idempotenceKey = uuidv4();
    const { data } = await this.agent.post(
      `/payments/${paymentId}/cancel`,
      {},
      { headers: { 'Idempotence-Key': idempotenceKey } },
    );
    return data;
  }


}
