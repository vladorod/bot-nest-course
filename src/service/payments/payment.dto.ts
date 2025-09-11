// dto/yookassa.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn, IsInt,
  IsISO8601,
  IsNotEmpty, IsNumber,
  IsObject,
  IsOptional,
  IsString, Length, Matches, Min,
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


/* ===================== Receipt (FFD) ===================== */

export enum TaxSystemCode {
  OSN = 1,               // Общая
  USN_INCOME = 2,        // УСН доход
  USN_INCOME_OUTCOME = 3,// УСН доход-расход
  ENVD = 4,              // ЕНВД (устаревшая, но в API ещё встречается)
  ESN = 5,               // ЕСХН
  PATENT = 6,            // Патент
}

export enum VatCode {
  VAT_20 = 1,       // НДС 20%
  VAT_10 = 2,       // НДС 10%
  VAT_0 = 3,        // НДС 0%
  WITHOUT_VAT = 4,  // Без НДС
  VAT_20_120 = 5,   // НДС 20/120
  VAT_10_110 = 6,   // НДС 10/110
  // 7 не используем, чтобы не плодить путаницу
}

export enum PaymentSubject {
  Commodity = 'commodity',           // Товар
  Service = 'service',               // Услуга
  Payment = 'payment',               // Платёж
  Another = 'another',               // Иное
}

export enum PaymentMode {
  FullPrepayment = 'full_prepayment',
  Prepayment = 'prepayment',
  Advance = 'advance',
  FullPayment = 'full_payment',
  PartialPayment = 'partial_payment',
  Credit = 'credit',
  CreditPayment = 'credit_payment',
}

export class SupplierInfoDto {
  @ApiProperty({ description: 'Наименование поставщика', example: 'ООО Ромашка' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'ИНН поставщика', example: '7707083893' })
  @IsString()
  @Length(10, 12)
  inn!: string;

  @ApiProperty({
    description: 'Телефоны поставщика',
    example: ['+7 495 000-00-00'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  phones!: string[];
}

export class MarkQuantityDto {
  @ApiProperty({ description: 'Числитель количества маркированного товара', example: 1 })
  @IsInt()
  @Min(1)
  numerator!: number;

  @ApiProperty({ description: 'Знаменатель количества маркированного товара', example: 1 })
  @IsInt()
  @Min(1)
  denominator!: number;
}

export class ReceiptItemDto {
  @ApiProperty({
    description: 'Название позиции (1–128 символов)',
    example: 'Подписка на месяц',
  })
  @IsString()
  @Length(1, 128)
  description!: string;

  @ApiProperty({
    description: 'Количество (до 6 знаков после запятой)',
    example: 1,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity!: number;

  @ApiProperty({
    description: 'Сумма по позиции (amount.value — формат 0.00)',
    type: () => AmountDto,
    example: { value: '399.00', currency: Currency.RUB },
  })
  @ValidateNested()
  @Type(() => AmountDto)
  amount!: AmountDto;

  @ApiProperty({
    description: 'Код ставки НДС',
    enum: VatCode,
    example: VatCode.WITHOUT_VAT,
  })
  @IsEnum(VatCode)
  vat_code!: VatCode;

  @ApiProperty({
    description: 'Предмет расчёта (FFD)',
    enum: PaymentSubject,
    example: PaymentSubject.Service,
  })
  @IsEnum(PaymentSubject)
  payment_subject!: PaymentSubject;

  @ApiProperty({
    description: 'Признак способа расчёта (FFD)',
    enum: PaymentMode,
    example: PaymentMode.FullPayment,
  })
  @IsEnum(PaymentMode)
  payment_mode!: PaymentMode;

  @ApiPropertyOptional({
    description: 'Код товара (маркировка/штрихкод/GTIN/код товара)',
    example: '010460123456789021nB9mJt8bYh2',
  })
  @IsOptional()
  @IsString()
  product_code?: string;

  @ApiPropertyOptional({
    description: 'Страна происхождения (ISO 3166-1 alpha-2)',
    example: 'RU',
  })
  @IsOptional()
  @IsString()
  country_of_origin_code?: string;

  @ApiPropertyOptional({
    description: 'Номер таможенной декларации',
    example: '10714040/140917/1234567',
  })
  @IsOptional()
  @IsString()
  customs_declaration_number?: string;

  @ApiPropertyOptional({
    description: 'Акциз (0.00 — если нет)',
    example: '0.00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{2})$/)
  excise?: string;

  @ApiPropertyOptional({
    description: 'Информация о поставщике (для агентских схем)',
    type: () => SupplierInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierInfoDto)
  supplier?: SupplierInfoDto;

  @ApiPropertyOptional({
    description: 'Дробное количество маркированного товара',
    type: () => MarkQuantityDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MarkQuantityDto)
  mark_quantity?: MarkQuantityDto;
}

export class CustomerDto {
  @ApiPropertyOptional({ description: 'E-mail покупателя', example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Телефон покупателя (E.164 или с пробелами)',
    example: '+7 900 000-00-00',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Полное имя покупателя', example: 'Иванов Иван Иванович' })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  full_name?: string;

  @ApiPropertyOptional({ description: 'ИНН покупателя (если требуется)', example: '7707083893' })
  @IsOptional()
  @IsString()
  @Length(10, 12)
  inn?: string;

  @ApiPropertyOptional({ description: 'Адрес (если нужен для чека)', example: 'г. Москва, ул. Пушкина, д. 1' })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  address?: string;
}

export class ReceiptDto {
  @ApiPropertyOptional({
    description: 'СНО (система налогообложения продавца)',
    enum: TaxSystemCode,
    example: TaxSystemCode.USN_INCOME,
  })
  @IsOptional()
  @IsEnum(TaxSystemCode)
  tax_system_code?: TaxSystemCode;

  @ApiProperty({
    description: 'Позиции чека',
    type: () => [ReceiptItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items!: ReceiptItemDto[];

  @ApiPropertyOptional({
    description: 'Данные покупателя',
    type: () => CustomerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;
}

/* ===================== Common DTOs ===================== */

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

  @ApiPropertyOptional({
    description: 'Данные для формирования фискального чека (FFD)',
    type: () => ReceiptDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptDto)
  receipt?: ReceiptDto;
}
