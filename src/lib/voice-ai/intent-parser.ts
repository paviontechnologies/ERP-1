import { Permission } from '@/lib/auth';

export type VoiceIntentType =
  | 'GET_TODAY_SALES'
  | 'GET_REVENUE_EXPENSES'
  | 'CHECK_BUDGET_OVERRUNS'
  | 'LIST_LOW_STOCK'
  | 'CREATE_DRAFT_PO'
  | 'OVERDUE_SUPPLIERS'
  | 'TODAY_ATTENDANCE'
  | 'GENERATE_PAYROLL_SUMMARY'
  | 'OVERDUE_INVOICES'
  | 'UNFULFILLED_ORDERS_LOW_STOCK'
  | 'UNPAID_DELIVERED_ORDERS'
  | 'COMPARE_PROCUREMENT_BUDGET'
  | 'GENERAL_ERP_STATUS'
  | 'UNKNOWN';

export interface ParsedVoiceCommand {
  rawQuery: string;
  normalizedQuery: string;
  detectedLanguage: 'en' | 'hi' | 'hinglish';
  intent: VoiceIntentType;
  requiredPermission: Permission;
  requiresConfirmation: boolean;
  module: string;
  slots: {
    productName?: string;
    productSku?: string;
    quantity?: number;
    vendorName?: string;
    departmentName?: string;
    timeframe?: string;
  };
}

export function parseVoiceIntent(query: string): ParsedVoiceCommand {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // Detect language hint
  const hasHindiDevanagari = /[\u0900-\u097F]/.test(query);
  const hasHinglishKeywords = /(aaj|kitni|kitna|hain|dikhao|karo|banao|mahine|kaunsa|konsa|kharcha|karcha|paisa|paisa|chahiye|overdue)/i.test(lower);
  const detectedLanguage: 'en' | 'hi' | 'hinglish' = hasHindiDevanagari ? 'hi' : hasHinglishKeywords ? 'hinglish' : 'en';

  const defaultCommand: ParsedVoiceCommand = {
    rawQuery: trimmed,
    normalizedQuery: lower,
    detectedLanguage,
    intent: 'UNKNOWN',
    requiredPermission: 'view:analytics',
    requiresConfirmation: false,
    module: 'GENERAL',
    slots: {},
  };

  // Specific Cross-Department Intention 1: Sales orders unfulfilled due to low stock
  if (
    /(sales orders?.*(unfulfilled|not fulfilled|cannot be fulfilled|cannot fulfill)|unfulfilled.*stock|stock.*shortage.*sales orders?|sales orders?.*low stock|orders.*stock kam)/i.test(lower) ||
    /स्टॉक की कमी के कारण अधूरे ऑर्डर/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'UNFULFILLED_ORDERS_LOW_STOCK',
      requiredPermission: 'view:sales',
      module: 'CROSS_DEPT',
    };
  }

  // Specific Cross-Department Intention 2: Unpaid invoices for delivered orders
  if (
    /(unpaid.*delivered|delivered.*unpaid|unpaid invoices.*delivered|order.*delivered.*unpaid)/i.test(lower) ||
    /डिलीवर किए गए बिना भुगतान वाले चालान/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'UNPAID_DELIVERED_ORDERS',
      requiredPermission: 'view:finance',
      module: 'CROSS_DEPT',
    };
  }

  // Specific Cross-Department Intention 3: Compare procurement spending with finance budget
  if (
    /(procurement.*spending.*finance.*budget|compare.*procurement.*budget|procurement.*budget|procurement spending)/i.test(lower) ||
    /खरीद खर्च और बजट की तुलना/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'COMPARE_PROCUREMENT_BUDGET',
      requiredPermission: 'view:finance',
      module: 'CROSS_DEPT',
    };
  }

  // 1. Today's Sales: "Aaj company ki total sales kitni hain?", "today sales", "total sales today"
  if (
    /(aaj.*sales|sales.*aaj|today.*sales|sales.*today|aaj ki sales|today's sales)/i.test(lower) ||
    /आज.*बिक्री|कुल बिक्री/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'GET_TODAY_SALES',
      requiredPermission: 'view:sales',
      module: 'SALES',
    };
  }

  // 2. Revenue & Expenses: "Show me this month's revenue and expenses", "revenue aur expenses dikhao"
  if (
    /(revenue.*expense|expense.*revenue|income.*expense|is mahine.*revenue|revenue.*kharche|kharcha.*revenue)/i.test(lower) ||
    /राजस्व.*खर्च|कमाई.*खर्च/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'GET_REVENUE_EXPENSES',
      requiredPermission: 'view:finance',
      module: 'FINANCE',
    };
  }

  // 3. Budget Overrun: "Which department exceeded its budget?", "kaunsa department budget cross kiya"
  if (
    /(department.*exceed.*budget|budget.*exceed|budget.*overrun|budget.*cross|konsa department budget|kaunsa department budget)/i.test(lower) ||
    /बजट से अधिक|बजट पार/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'CHECK_BUDGET_OVERRUNS',
      requiredPermission: 'view:finance',
      module: 'FINANCE',
    };
  }

  // 4. Low Stock: "Show products with low stock", "kam stock wale products dikhao", "low inventory"
  if (
    /(low.*stock|stock.*low|kam.*stock|kam stock wale|products.*low stock|shortage.*product|low inventory)/i.test(lower) ||
    /कम स्टॉक|स्टॉक की कमी/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'LIST_LOW_STOCK',
      requiredPermission: 'view:inventory',
      module: 'INVENTORY',
    };
  }

  // 5. Create Draft Purchase Order: "Create a draft purchase order for 100 units of product X"
  if (
    /(create.*draft.*purchase order|create.*purchase order|draft purchase order|draft po banao|purchase order banao|po banao)/i.test(lower) ||
    /खरीद आदेश बनाओ|ड्राफ्ट पीओ/i.test(query)
  ) {
    // Extract quantity
    const qtyMatch = lower.match(/(\d+)\s*(unit|units|pcs|kg|mtr|pieces)?/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 100;

    // Extract product name if mentioned
    let productName = 'Lithium Iron Phosphate (LiFePO4) 48V Cell';
    if (lower.includes('steel') || lower.includes('rod')) productName = 'Industrial Steel Rod 12mm High-Tensile';
    else if (lower.includes('aluminum') || lower.includes('ingot')) productName = 'Aluminum Alloy Ingot 6061-T6';
    else if (lower.includes('mcu') || lower.includes('microcontroller')) productName = 'STM32 Microcontroller IC 32-bit Cortex';

    return {
      ...defaultCommand,
      intent: 'CREATE_DRAFT_PO',
      requiredPermission: 'manage:procurement',
      requiresConfirmation: true, // Sensitive action guardrail!
      module: 'PROCUREMENT',
      slots: {
        quantity,
        productName,
      },
    };
  }

  // 6. Overdue Suppliers: "Which suppliers have overdue deliveries?", "kin suppliers ki delivery overdue hai"
  if (
    /(supplier.*overdue|supplier.*delay|vendor.*delay|overdue.*deliver|kin suppliers.*delivery|overdue supplier)/i.test(lower) ||
    /आपूर्तिकर्ता.*देरी|सप्लायर.*ओवरड्यू/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'OVERDUE_SUPPLIERS',
      requiredPermission: 'view:procurement',
      module: 'PROCUREMENT',
    };
  }

  // 7. Today's Attendance: "How many employees are present today?", "aaj kitne employees present hain"
  if (
    /(employees.*present|present.*today|attendance.*today|aaj.*present|kitne employee present|aaj ki attendance)/i.test(lower) ||
    /कर्मचारी उपस्थित|आज की उपस्थिति/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'TODAY_ATTENDANCE',
      requiredPermission: 'view:hr',
      module: 'HRMS',
    };
  }

  // 8. Payroll Summary: "Generate the monthly payroll summary", "payroll summary dikhao"
  if (
    /(payroll.*summary|monthly payroll|generate.*payroll|salary.*summary|payroll dikhao)/i.test(lower) ||
    /वेतन सारांश|पेरोल सारांश/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'GENERATE_PAYROLL_SUMMARY',
      requiredPermission: 'view:hr',
      module: 'HRMS',
    };
  }

  // 9. Overdue Invoices: "Show all overdue customer invoices", "overdue invoices dikhao"
  if (
    /(overdue.*invoice|overdue customer|unpaid.*overdue|pending.*invoice.*overdue|overdue bills)/i.test(lower) ||
    /बकाया चालान|ओवरड्यू बिल/i.test(query)
  ) {
    return {
      ...defaultCommand,
      intent: 'OVERDUE_INVOICES',
      requiredPermission: 'view:finance',
      module: 'FINANCE',
    };
  }

  // 10. General ERP Status / Overview
  if (/(overview|status|dashboard|kya chal raha|summary|company status)/i.test(lower)) {
    return {
      ...defaultCommand,
      intent: 'GENERAL_ERP_STATUS',
      requiredPermission: 'view:analytics',
      module: 'GENERAL',
    };
  }

  return defaultCommand;
}
