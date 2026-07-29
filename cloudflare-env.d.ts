declare namespace Cloudflare {
  interface Env {
    APP_SECRET?: string;
    ADMIN_API_SECRET?: string;
    PUBLIC_APP_URL?: string;
    PAYMENT_PROVIDER_MODE?: string;
    PAYMENT_DEMO_SECRET?: string;
    PAYMENT_TTL_MINUTES?: string;
    ACCESS_CODE_TTL_DAYS?: string;
    QPAY_BASE_URL?: string;
    QPAY_CLIENT_ID?: string;
    QPAY_CLIENT_SECRET?: string;
    QPAY_INVOICE_CODE?: string;
    QPAY_BRANCH_CODE?: string;
    QPAY_STAFF_CODE?: string;
    QPAY_TERMINAL_CODE?: string;
    QPAY_LINE_TAX_CODE?: string;
    QPAY_DISTRICT_CODE?: string;
    QPAY_TAX_TYPE?: string;
    QPAY_INVOICE_OPTIONS_JSON?: string;
  }
}
