// dto/yookassa.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';

/* ===================== Enums ===================== */

export enum YooEvent {
  PaymentSucceeded = 'payment.succeeded',
  PaymentWaitingForCapture = 'payment.waiting_for_capture',
  PaymentCanceled = 'payment.canceled',
  RefundSucceeded = 'refund.succeeded',
}

export enum PaymentStatus {
  WaitingForCapture = 'waiting_for_capture',
  Succeeded = 'succeeded',
  Canceled = 'canceled',
}

export enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
  KZT = 'KZT',
  BYN = 'BYN',
}

export enum PaymentMethodType {
  BankCard = 'bank_card',
  YooMoney = 'yoo_money',
  SBP = 'sbp',
  // дополни при необходимости
}

/* ===================== Common DTOs ===================== */

export class AmountDto {
  @ApiProperty({
    description: 'Сумма платежа строкой с двумя знаками после запятой',
    example: '2.00',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({
    description: 'Валюта',
    enum: Currency,
    example: Currency.RUB,
  })
  @IsEnum(Currency)
  currency!: Currency;
}

export class ThreeDSecureDto {
  @ApiProperty({ description: '3-D Secure применён', example: true })
  @IsBoolean()
  applied!: boolean;
}

export class AuthorizationDetailsDto {
  @ApiPropertyOptional({ description: 'RRN', example: '603668680243' })
  @IsOptional()
  @IsString()
  rrn?: string;

  @ApiPropertyOptional({ description: 'Код авторизации', example: '000000' })
  @IsOptional()
  @IsString()
  auth_code?: string;

  @ApiPropertyOptional({
    description: 'Информация по 3-D Secure',
    type: ThreeDSecureDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThreeDSecureDto)
  three_d_secure?: ThreeDSecureDto;
}

export class CardDto {
  @ApiProperty({ description: 'Первые 6 цифр карты', example: '555555' })
  @IsString()
  first6!: string;

  @ApiProperty({ description: 'Последние 4 цифры карты', example: '4444' })
  @IsString()
  last4!: string;

  @ApiProperty({ description: 'Месяц истечения', example: '12' })
  @IsString()
  expiry_month!: string;

  @ApiProperty({ description: 'Год истечения', example: '2030' })
  @IsString()
  expiry_year!: string;

  @ApiProperty({ description: 'Тип карты', example: 'MasterCard' })
  @IsString()
  card_type!: string;

  @ApiPropertyOptional({ description: 'Страна эмитента', example: 'RU' })
  @IsOptional()
  @IsString()
  issuer_country?: string;

  @ApiPropertyOptional({ description: 'Наименование эмитента', example: 'Sberbank' })
  @IsOptional()
  @IsString()
  issuer_name?: string;
}

export class PaymentMethodDto {
  @ApiProperty({
    description: 'Тип метода оплаты',
    enum: PaymentMethodType,
    example: PaymentMethodType.BankCard,
  })
  @IsEnum(PaymentMethodType)
  type!: PaymentMethodType;

  @ApiProperty({
    description: 'ID метода оплаты (если сохранённый/привязанный)',
    example: 'pm_0000000000000000000001',
  })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Признак сохранённого метода', example: false })
  @IsBoolean()
  saved!: boolean;

  @ApiPropertyOptional({ description: 'Информация о карте', type: CardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto;

  @ApiPropertyOptional({ description: 'Человекочитаемый заголовок', example: 'Bank card *4444' })
  @IsOptional()
  @IsString()
  title?: string;
}

/* ===================== Payment Object (webhook) ===================== */

export class YooPaymentObjectDto {
  @ApiProperty({ description: 'ID платежа', example: '22d6d597-000f-5000-9000-145f6df21d6f' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Статус платежа', enum: PaymentStatus, example: PaymentStatus.WaitingForCapture })
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @ApiProperty({ description: 'Оплачен ли платеж', example: true })
  @IsBoolean()
  paid!: boolean;

  @ApiProperty({ description: 'Сумма', type: AmountDto })
  @ValidateNested()
  @Type(() => AmountDto)
  amount!: AmountDto;

  @ApiPropertyOptional({ description: 'Детали авторизации', type: AuthorizationDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorizationDetailsDto)
  authorization_details?: AuthorizationDetailsDto;

  @ApiProperty({
    description: 'Дата создания',
    example: '2018-07-10T14:27:54.691Z',
  })
  @IsISO8601()
  created_at!: string;

  @ApiPropertyOptional({
    description: 'Дата истечения',
    example: '2018-07-17T14:28:32.484Z',
  })
  @IsOptional()
  @IsISO8601()
  expires_at?: string;

  @ApiPropertyOptional({ description: 'Описание', example: 'Заказ №72' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Произвольные метаданные',
    example: { orderId: '72' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Метод оплаты', type: PaymentMethodDto })
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  payment_method!: PaymentMethodDto;

  @ApiProperty({ description: 'Возможен ли возврат', example: true })
  @IsBoolean()
  refundable!: boolean;

  @ApiProperty({ description: 'Тестовый режим', example: false })
  @IsBoolean()
  test!: boolean;
}

/* ===================== Notification (webhook envelope) ===================== */

export class YooNotificationDto {
  @ApiProperty({ description: 'Тип сообщения', example: 'notification' })
  @IsIn(['notification'])
  type!: 'notification';

  @ApiProperty({
    description: 'Событие',
    enum: YooEvent,
    example: YooEvent.PaymentWaitingForCapture,
  })
  @IsEnum(YooEvent)
  event!: YooEvent;

  @ApiProperty({ description: 'Объект платежа', type: YooPaymentObjectDto })
  @ValidateNested()
  @Type(() => YooPaymentObjectDto)
  object!: YooPaymentObjectDto;
}

/* ===================== Create Payment DTO (request) ===================== */

export class ConfirmationRedirectDto {
  @ApiProperty({
    description: 'Тип подтверждения',
    enum: ['redirect'],
    example: 'redirect',
  })
  @IsIn(['redirect'])
  type!: 'redirect';

  @ApiProperty({
    description: 'URL, куда вернётся пользователь после оплаты',
    example: 'https://example.com/payment/return',
  })
  @IsString()
  @IsNotEmpty()
  return_url!: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Сумма платежа',
    type: AmountDto,
    example: { value: '2.00', currency: Currency.RUB },
  })
  @ValidateNested()
  @Type(() => AmountDto)
  amount!: AmountDto;

  @ApiPropertyOptional({
    description: 'Описание платежа',
    example: 'Заказ №72',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Подтверждение через редирект',
    type: ConfirmationRedirectDto,
    example: {
      type: 'redirect',
      return_url: 'https://example.com/payment/return',
    },
  })
  @ValidateNested()
  @Type(() => ConfirmationRedirectDto)
  confirmation!: ConfirmationRedirectDto;

  @ApiPropertyOptional({
    description:
      'Если true — списание сразу; если false — двухфазный платеж (waiting_for_capture)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  capture?: boolean;

  @ApiPropertyOptional({
    description: 'Произвольные метаданные',
    example: { orderId: '72' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
