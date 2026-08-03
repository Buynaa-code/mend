# mend.

Төрсөн өдрийн интерактив мэндчилгээ үүсгэж, QPay төлбөр баталгаажсаны
дараа нэг удаагийн `BDY-XXXXXX` эрхээр нийтэлдэг vinext/Cloudflare Worker апп.

## Үндсэн урсгал

- `/create` — template, нэр, зураг, дуу, мессеж, mobile preview
- `/pay` — 5,500₮ төлбөр. `wire` горимд wire.mn hosted checkout
  (`pay.wire.mn`) руу чиглүүлж, QR код + банкны deeplink-ийг тэнд харуулна.
  `qpay` горимд QR-ээ шууд энэ хуудсан дээр харуулна.
- `/g/:slug` — хүлээн авагчийн public мэндчилгээ
- `/dashboard` — нээлт, reaction, guestbook

`1 төлбөр = 1 мэндчилгээний линк`. Frontend төлбөрийг амжилттай гэж
тогтоохгүй. QPay callback ирсний дараа backend `/v2/payment/check` ашиглан
баталгаажуулж, access code үүсгэнэ.

## Технологи

- vinext + React
- Cloudflare Worker
- D1: greeting, payment, access code, reaction
- R2: зураг, дуу
- Drizzle: schema болон migration

## Local ажиллуулах

```bash
npm install
cp .env.example .env.local
npm run dev
```

QPay sandbox ашиглахдаа `.env.local` дотор merchant credential болон
`APP_SECRET`-ээ тохируулна. Нууц түлхүүрүүдийг client code-д оруулахгүй.

## Demo payment тест

Эхний terminal:

```bash
APP_SECRET='local-test-app-secret-32-characters-minimum' \
PAYMENT_PROVIDER_MODE=demo \
PAYMENT_DEMO_SECRET='local-demo-confirm-secret-2026' \
npm run dev
```

Хоёр дахь terminal:

```bash
PAYMENT_DEMO_SECRET='local-demo-confirm-secret-2026' \
npm run test:payment-flow
```

Энэ тест checkout, pending төлөв, backend confirm, `BDY-` код, concurrent
publish, public data leak, dashboard token, code `used` төлвийг шалгана.

## Бусад шалгалт

```bash
npm test
npm run lint
npm run typecheck
```

## Server environment

Заавал:

- `APP_SECRET`
- `QPAY_CLIENT_ID`
- `QPAY_CLIENT_SECRET`
- `QPAY_INVOICE_CODE`

Сонголтоор:

- `PUBLIC_APP_URL`
- `ADMIN_API_SECRET`
- `QPAY_BASE_URL`
- `QPAY_BRANCH_CODE`
- `QPAY_STAFF_CODE`
- `QPAY_TERMINAL_CODE`
- `QPAY_INVOICE_OPTIONS_JSON`

`POST /api/admin/payments` нь server-only bearer secret-ээр manual
`approve`, `revoke`, `refund` үйлдэл хийж audit event хадгална.
