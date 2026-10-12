import {
  UserRole,
  ProductType,
  SalesOrderStatus,
  PaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  WorkOrderStatus,
  OperationStatus,
  AccountType,
  AccountSubType,
  EmployeeStatus,
  AttendanceStatus,
  ApprovalStatus,
  PayrollStatus,
  ProjectStatus,
  BillingType,
  TaskStatus,
  TicketStatus,
  TicketCategory,
  PriorityLevel,
} from '@prisma/client';

let idCounter = 1000;
const uid = (prefix = 'id') => `${prefix}-${++idCounter}-${Date.now().toString(36)}`;

function matchesWhere(item: any, where?: any): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (condition === undefined) continue;
    if (key === 'OR' && Array.isArray(condition)) {
      if (!condition.some((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(condition)) {
      if (!condition.every((sub) => matchesWhere(item, sub))) return false;
      continue;
    }

    const val = item[key];
    if (condition !== null && typeof condition === 'object' && !(condition instanceof Date)) {
      const cond = condition as Record<string, any>;
      if ('equals' in cond && val !== cond.equals) return false;
      if ('not' in cond && val === cond.not) return false;
      if ('in' in cond && Array.isArray(cond.in) && !cond.in.includes(val)) return false;
      if ('notIn' in cond && Array.isArray(cond.notIn) && cond.notIn.includes(val)) return false;
      if ('gt' in cond && !(val > cond.gt)) return false;
      if ('gte' in cond && !(val >= cond.gte)) return false;
      if ('lt' in cond && !(val < cond.lt)) return false;
      if ('lte' in cond && !(val <= cond.lte)) return false;
      if ('contains' in cond && typeof val === 'string' && !val.toLowerCase().includes(String(cond.contains).toLowerCase())) return false;
    } else {
      if (val instanceof Date && condition instanceof Date) {
        if (val.getTime() !== condition.getTime()) return false;
      } else if (val !== condition) {
        return false;
      }
    }
  }
  return true;
}

class MemoryCollection<T extends Record<string, any>> {
  items: T[] = [];

  constructor(initialData: T[] = []) {
    this.items = [...initialData];
  }

  async findFirst(args?: { where?: any; include?: any; orderBy?: any }): Promise<T | null> {
    const filtered = this.items.filter((item) => matchesWhere(item, args?.where));
    if (filtered.length === 0) return null;
    return JSON.parse(JSON.stringify(filtered[0]));
  }

  async findMany(args?: { where?: any; include?: any; orderBy?: any; take?: number }): Promise<T[]> {
    let result = this.items.filter((item) => matchesWhere(item, args?.where));
    if (args?.take && args.take > 0) {
      result = result.slice(0, args.take);
    }
    return JSON.parse(JSON.stringify(result));
  }

  async findUnique(args: { where: any; include?: any }): Promise<T | null> {
    return this.findFirst(args);
  }

  async count(args?: { where?: any }): Promise<number> {
    return this.items.filter((item) => matchesWhere(item, args?.where)).length;
  }

  async create(args: { data: any; include?: any }): Promise<T> {
    const newItem = {
      id: args.data.id || uid('rec'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...args.data,
    } as unknown as T;
    this.items.unshift(newItem);
    return JSON.parse(JSON.stringify(newItem));
  }

  async createMany(args: { data: any[]; skipDuplicates?: boolean }): Promise<{ count: number }> {
    let count = 0;
    for (const d of args.data) {
      await this.create({ data: d });
      count++;
    }
    return { count };
  }

  async update(args: { where: any; data: any; include?: any }): Promise<T> {
    const idx = this.items.findIndex((item) => matchesWhere(item, args.where));
    if (idx === -1) {
      return this.create({ data: { ...args.where, ...args.data } });
    }
    this.items[idx] = {
      ...this.items[idx],
      ...args.data,
      updatedAt: new Date(),
    };
    return JSON.parse(JSON.stringify(this.items[idx]));
  }

  async updateMany(args: { where: any; data: any }): Promise<{ count: number }> {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (matchesWhere(this.items[i], args.where)) {
        this.items[i] = { ...this.items[i], ...args.data, updatedAt: new Date() };
        count++;
      }
    }
    return { count };
  }

  async upsert(args: { where: any; update: any; create: any; include?: any }): Promise<T> {
    const existing = await this.findFirst({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    }
    return this.create({ data: args.create });
  }

  async delete(args: { where: any }): Promise<T> {
    const idx = this.items.findIndex((item) => matchesWhere(item, args.where));
    if (idx === -1) throw new Error('Record to delete not found');
    const [deleted] = this.items.splice(idx, 1);
    return deleted;
  }

  async deleteMany(args?: { where?: any }): Promise<{ count: number }> {
    const initial = this.items.length;
    this.items = this.items.filter((item) => !matchesWhere(item, args?.where));
    return { count: initial - this.items.length };
  }
}

const orgId = 'org-apex-global-01';
const mumbaiBranchId = 'branch-mum-01';
const delhiBranchId = 'branch-del-01';
const blrBranchId = 'branch-blr-01';

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const defaultOrg = {
  id: orgId,
  name: 'Apex Global Industries Ltd.',
  code: 'APEX-GLOBAL',
  currency: 'INR',
  taxId: 'GSTIN27AABCA1234F1Z5',
  address: 'Apex Tower, Bandra Kurla Complex, Bandra East, Mumbai',
  phone: '+91 22 6789 5000',
  email: 'contact@apexglobal.com',
  createdAt: now,
  updatedAt: now,
};

const defaultBranches = [
  { id: mumbaiBranchId, organizationId: orgId, name: 'Mumbai Corporate Headquarters', code: 'MUM-HQ', city: 'Mumbai', state: 'Maharashtra', country: 'India', isHQ: true },
  { id: delhiBranchId, organizationId: orgId, name: 'Delhi Manufacturing Facility', code: 'DEL-PLANT', city: 'New Delhi', state: 'Delhi', country: 'India', isHQ: false },
  { id: blrBranchId, organizationId: orgId, name: 'Bengaluru Tech & R&D Hub', code: 'BLR-TECH', city: 'Bengaluru', state: 'Karnataka', country: 'India', isHQ: false },
];

const deptData = [
  { id: 'dept-exec', code: 'EXEC', name: 'Executive Leadership', budget: 1500000 },
  { id: 'dept-fin', code: 'FIN', name: 'Finance & Accounts', budget: 2500000 },
  { id: 'dept-hr', code: 'HR', name: 'Human Resources', budget: 1200000 },
  { id: 'dept-sales', code: 'SALES', name: 'Sales & Marketing', budget: 3000000 },
  { id: 'dept-proc', code: 'PROC', name: 'Procurement & SCM', budget: 5000000 },
  { id: 'dept-inv', code: 'INV', name: 'Inventory & Warehousing', budget: 2000000 },
  { id: 'dept-mfg', code: 'MFG', name: 'Manufacturing & Engineering', budget: 7500000 },
  { id: 'dept-proj', code: 'PROJ', name: 'Projects & Delivery', budget: 3500000 },
  { id: 'dept-supp', code: 'SUPP', name: 'Customer Support', budget: 1000000 },
];
const defaultDepartments = deptData.map((d) => ({
  id: d.id,
  organizationId: orgId,
  name: d.name,
  code: d.code,
  budget: d.budget,
}));

const defaultUsers = [
  { id: 'usr-admin', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-exec', name: 'Vikram Sharma', email: 'admin@apex.com', role: UserRole.SUPER_ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram' },
  { id: 'usr-ceo', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-exec', name: 'Rajesh Singhania', email: 'ceo@apex.com', role: UserRole.CEO, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh' },
  { id: 'usr-fin', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-fin', name: 'Ananya Iyer', email: 'finance@apex.com', role: UserRole.FINANCE_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya' },
  { id: 'usr-hr', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-hr', name: 'Priya Nair', email: 'hr@apex.com', role: UserRole.HR_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
  { id: 'usr-sales', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-sales', name: 'Rohan Verma', email: 'sales@apex.com', role: UserRole.SALES_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan' },
  { id: 'usr-proc', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-proc', name: 'Suresh Patel', email: 'procurement@apex.com', role: UserRole.PROCUREMENT_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh' },
  { id: 'usr-inv', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-inv', name: 'Manoj Kumar', email: 'inventory@apex.com', role: UserRole.INVENTORY_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manoj' },
  { id: 'usr-mfg', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-mfg', name: 'Arvind Deshmukh', email: 'production@apex.com', role: UserRole.PRODUCTION_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arvind' },
  { id: 'usr-proj', organizationId: orgId, branchId: blrBranchId, departmentId: 'dept-proj', name: 'Neha Gupta', email: 'projects@apex.com', role: UserRole.PROJECT_MANAGER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha' },
  { id: 'usr-emp', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-sales', name: 'Rahul Joshi', email: 'employee@apex.com', role: UserRole.EMPLOYEE, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul' },
];

const defaultAccounts = [
  { id: 'acc-1010', organizationId: orgId, code: '1010', name: 'Cash on Hand', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 350000 },
  { id: 'acc-1020', organizationId: orgId, code: '1020', name: 'HDFC Bank Operating Account', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 14850000 },
  { id: 'acc-1030', organizationId: orgId, code: '1030', name: 'Accounts Receivable (Trade Debtors)', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 2650000 },
  { id: 'acc-1040', organizationId: orgId, code: '1040', name: 'Raw Materials Inventory', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 4120000 },
  { id: 'acc-1050', organizationId: orgId, code: '1050', name: 'Finished Goods Inventory', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 7850000 },
  { id: 'acc-1500', organizationId: orgId, code: '1500', name: 'Plant, Machinery & Equipment', type: AccountType.ASSET, subType: AccountSubType.NON_CURRENT_ASSET, balance: 18500000 },
  { id: 'acc-2010', organizationId: orgId, code: '2010', name: 'Accounts Payable (Trade Creditors)', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, balance: 3820000 },
  { id: 'acc-2020', organizationId: orgId, code: '2020', name: 'Accrued Payroll & Statutory Dues', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, balance: 940000 },
  { id: 'acc-3010', organizationId: orgId, code: '3010', name: 'Shareholder Capital & Equity', type: AccountType.EQUITY, subType: AccountSubType.EQUITY, balance: 30000000 },
  { id: 'acc-4010', organizationId: orgId, code: '4010', name: 'Industrial Equipment Sales Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, balance: 28400000 },
  { id: 'acc-4020', organizationId: orgId, code: '4020', name: 'Project Engineering Services Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, balance: 8200000 },
  { id: 'acc-5010', organizationId: orgId, code: '5010', name: 'Cost of Raw Materials Consumed', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, balance: 14200000 },
  { id: 'acc-5020', organizationId: orgId, code: '5020', name: 'Direct Manufacturing Labor', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, balance: 3100000 },
  { id: 'acc-6010', organizationId: orgId, code: '6010', name: 'Employee Salaries & Allowances', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 5400000 },
  { id: 'acc-6020', organizationId: orgId, code: '6020', name: 'Facility Rent & Utilities', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 1250000 },
  { id: 'acc-6030', organizationId: orgId, code: '6030', name: 'Sales, Marketing & Travel', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 890000 },
];

const defaultWarehouses = [
  { id: 'wh-mum', organizationId: orgId, branchId: mumbaiBranchId, code: 'WH-MUM-01', name: 'Mumbai Central Distribution Center', city: 'Navi Mumbai', address: 'Plot 44, MIDC' },
  { id: 'wh-del', organizationId: orgId, branchId: delhiBranchId, code: 'WH-DEL-01', name: 'Delhi Manufacturing Materials Depot', city: 'New Delhi', address: 'Okhla Phase III' },
  { id: 'wh-blr', organizationId: orgId, branchId: blrBranchId, code: 'WH-BLR-01', name: 'Bengaluru Tech Logistics Hub', city: 'Bengaluru', address: 'Electronic City' },
];

const catRawId = 'cat-raw';
const catFGId = 'cat-fg';
const defaultCategories = [
  { id: catRawId, organizationId: orgId, name: 'Raw Materials & Components', description: 'Metals and electronics' },
  { id: catFGId, organizationId: orgId, name: 'Finished Industrial Goods', description: 'Power equipment and inverters' },
];

const defaultProducts = [
  { id: 'prd-rm-alu', organizationId: orgId, categoryId: catRawId, sku: 'RM-ALU-01', name: 'Aluminum Alloy Ingot 6061-T6', unit: 'KG', type: ProductType.RAW_MATERIAL, costPrice: 220, sellingPrice: 0, minStockLevel: 100, reorderPoint: 250, currentStock: 520, reservedStock: 50, availableStock: 470, isActive: true },
  { id: 'prd-rm-stl', organizationId: orgId, categoryId: catRawId, sku: 'RM-STL-12', name: 'Industrial Steel Rod 12mm High-Tensile', unit: 'MTR', type: ProductType.RAW_MATERIAL, costPrice: 340, sellingPrice: 0, minStockLevel: 200, reorderPoint: 350, currentStock: 140, reservedStock: 20, availableStock: 120, isActive: true },
  { id: 'prd-rm-mcu', organizationId: orgId, categoryId: catRawId, sku: 'RM-MCU-32', name: 'STM32 Microcontroller IC 32-bit Cortex', unit: 'PCS', type: ProductType.RAW_MATERIAL, costPrice: 480, sellingPrice: 0, minStockLevel: 150, reorderPoint: 300, currentStock: 85, reservedStock: 30, availableStock: 55, isActive: true },
  { id: 'prd-rm-bat', organizationId: orgId, categoryId: catRawId, sku: 'RM-BAT-48', name: 'Lithium Iron Phosphate (LiFePO4) 48V Cell', unit: 'PCS', type: ProductType.RAW_MATERIAL, costPrice: 1350, sellingPrice: 0, minStockLevel: 100, reorderPoint: 200, currentStock: 45, reservedStock: 15, availableStock: 30, isActive: true },
  { id: 'prd-rm-fst', organizationId: orgId, categoryId: catRawId, sku: 'RM-FST-08', name: 'Stainless Steel Fasteners Pack M8x40', unit: 'BOX', type: ProductType.RAW_MATERIAL, costPrice: 280, sellingPrice: 0, minStockLevel: 50, reorderPoint: 100, currentStock: 310, reservedStock: 10, availableStock: 300, isActive: true },

  { id: 'prd-fg-inv', organizationId: orgId, categoryId: catFGId, sku: 'FG-INV-5K', name: 'Smart Hybrid Solar Inverter 5kVA Pro', unit: 'PCS', type: ProductType.FINISHED_GOOD, costPrice: 23500, sellingPrice: 41900, minStockLevel: 15, reorderPoint: 30, currentStock: 38, reservedStock: 12, availableStock: 26, isActive: true },
  { id: 'prd-fg-iot', organizationId: orgId, categoryId: catFGId, sku: 'FG-IOT-PRO', name: 'Industrial Edge IoT Gateway Pro', unit: 'PCS', type: ProductType.FINISHED_GOOD, costPrice: 8900, sellingPrice: 17500, minStockLevel: 25, reorderPoint: 50, currentStock: 64, reservedStock: 14, availableStock: 50, isActive: true },
  { id: 'prd-fg-apd', organizationId: orgId, categoryId: catFGId, sku: 'FG-APD-100', name: 'Automated Power Distribution Panel 100A', unit: 'PCS', type: ProductType.FINISHED_GOOD, costPrice: 44000, sellingPrice: 76500, minStockLevel: 10, reorderPoint: 20, currentStock: 18, reservedStock: 4, availableStock: 14, isActive: true },
  { id: 'prd-fg-evc', organizationId: orgId, categoryId: catFGId, sku: 'FG-EVC-22', name: 'Commercial Dual-Gun EV Fast Charger 22kW', unit: 'PCS', type: ProductType.FINISHED_GOOD, costPrice: 36000, sellingPrice: 64900, minStockLevel: 10, reorderPoint: 25, currentStock: 8, reservedStock: 6, availableStock: 2, isActive: true },
];

const defaultVendors = [
  { id: 'vnd-001', organizationId: orgId, code: 'VND-001', name: 'Bharat Steel & Metal Alloys Ltd.', contactPerson: 'Harish Mehta', email: 'sales@bharatsteel.com', phone: '+91 22 4099 8877', taxNumber: '27AAACB2233M1Z2', rating: 4.8 },
  { id: 'vnd-002', organizationId: orgId, code: 'VND-002', name: 'Silicon Semi Electronics Pvt Ltd', contactPerson: 'Karthik Raman', email: 'orders@siliconsemi.in', phone: '+91 80 2345 6789', taxNumber: '29AABCS8899K1Z4', rating: 4.9 },
  { id: 'vnd-003', organizationId: orgId, code: 'VND-003', name: 'Apex Energy Cells & Storage Systems', contactPerson: 'Sunil Rao', email: 'supply@apexcells.com', phone: '+91 265 244 5566', taxNumber: '24AACCA7766P1Z3', rating: 4.6 },
  { id: 'vnd-004', organizationId: orgId, code: 'VND-004', name: 'Precision Fasteners & Hardware Corp', contactPerson: 'Naveen Jain', email: 'fasteners@precisioncorp.in', phone: '+91 11 2877 3456', taxNumber: '07AAECP1122D1Z1', rating: 4.7 },
];

const defaultCustomers = [
  { id: 'cust-001', organizationId: orgId, code: 'CUST-001', name: 'Tata Power Renewable Energy Ltd.', email: 'procurement@tatapowerrenewables.com', phone: '+91 22 6665 8282', company: 'Tata Power Renewable Energy Ltd.', creditLimit: 5000000, outstandingBalance: 840000 },
  { id: 'cust-002', organizationId: orgId, code: 'CUST-002', name: 'Larsen & Toubro Heavy Infrastructure', email: 'vendor.desk@larsentoubro.com', phone: '+91 22 6752 5656', company: 'Larsen & Toubro Heavy Infrastructure', creditLimit: 7500000, outstandingBalance: 1450000 },
  { id: 'cust-003', organizationId: orgId, code: 'CUST-003', name: 'Reliance Green Energy Solutions', email: 'solar.buying@ril.com', phone: '+91 22 3555 5000', company: 'Reliance Green Energy Solutions', creditLimit: 10000000, outstandingBalance: 360000 },
  { id: 'cust-004', organizationId: orgId, code: 'CUST-004', name: 'Mahindra Logistics Park Operations', email: 'facility.tech@mahindra.com', phone: '+91 22 2846 8000', company: 'Mahindra Logistics Park Operations', creditLimit: 3000000, outstandingBalance: 0 },
];

const defaultSalesOrders = [
  {
    id: 'so-001',
    organizationId: orgId,
    branchId: mumbaiBranchId,
    orderNumber: 'SO-2026-0891',
    customerId: 'cust-001',
    customer: defaultCustomers[0],
    status: SalesOrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PARTIAL,
    subtotal: 419000,
    taxAmount: 75420,
    totalAmount: 494420,
    createdById: 'usr-sales',
    confirmedAt: now,
    items: [
      { id: 'soi-001', salesOrderId: 'so-001', productId: 'prd-fg-inv', product: defaultProducts[5], quantity: 10, reservedQuantity: 10, unitPrice: 41900, total: 419000 },
    ],
    invoices: [],
  },
  {
    id: 'so-002',
    organizationId: orgId,
    branchId: mumbaiBranchId,
    orderNumber: 'SO-2026-0740',
    customerId: 'cust-002',
    customer: defaultCustomers[1],
    status: SalesOrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PENDING,
    subtotal: 262500,
    taxAmount: 47250,
    totalAmount: 309750,
    createdById: 'usr-sales',
    confirmedAt: new Date(Date.now() - 40 * 86400000),
    items: [
      { id: 'soi-002', salesOrderId: 'so-002', productId: 'prd-fg-iot', product: defaultProducts[6], quantity: 15, reservedQuantity: 0, unitPrice: 17500, total: 262500 },
    ],
    invoices: [],
  },
];

const defaultInvoices = [
  {
    id: 'inv-001',
    organizationId: orgId,
    branchId: mumbaiBranchId,
    invoiceNumber: 'INV-2026-0891',
    salesOrderId: 'so-001',
    customerId: 'cust-001',
    customer: defaultCustomers[0],
    issueDate: now,
    dueDate: new Date(Date.now() + 30 * 86400000),
    status: InvoiceStatus.PARTIALLY_PAID,
    subtotal: 419000,
    taxAmount: 75420,
    totalAmount: 494420,
    paidAmount: 250000,
    balanceDue: 244420,
  },
  {
    id: 'inv-002',
    organizationId: orgId,
    branchId: mumbaiBranchId,
    invoiceNumber: 'INV-2026-0740',
    salesOrderId: 'so-002',
    customerId: 'cust-002',
    customer: defaultCustomers[1],
    issueDate: new Date(Date.now() - 35 * 86400000),
    dueDate: new Date(Date.now() - 5 * 86400000),
    status: InvoiceStatus.OVERDUE,
    subtotal: 262500,
    taxAmount: 47250,
    totalAmount: 309750,
    paidAmount: 0,
    balanceDue: 309750,
  },
];

const defaultPayments = [
  {
    id: 'pay-001',
    organizationId: orgId,
    paymentNumber: 'PAY-2026-0412',
    invoiceId: 'inv-001',
    customerId: 'cust-001',
    amount: 250000,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    referenceNumber: 'HDFC-NEFT-99881122',
    createdById: 'usr-fin',
    createdAt: now,
  },
];

const defaultPurchaseOrders = [
  {
    id: 'po-001',
    organizationId: orgId,
    branchId: delhiBranchId,
    vendorId: 'vnd-003',
    vendor: defaultVendors[2],
    poNumber: 'PO-2026-0182',
    status: PurchaseOrderStatus.ISSUED,
    subtotal: 270000,
    taxAmount: 48600,
    totalAmount: 318600,
    expectedDeliveryDate: new Date(Date.now() + 5 * 86400000),
    createdById: 'usr-proc',
    approvedById: 'usr-ceo',
    items: [
      { id: 'poi-001', purchaseOrderId: 'po-001', productId: 'prd-rm-bat', product: defaultProducts[3], quantity: 200, unitPrice: 1350, total: 270000 },
    ],
  },
  {
    id: 'po-002',
    organizationId: orgId,
    branchId: delhiBranchId,
    vendorId: 'vnd-001',
    vendor: defaultVendors[0],
    poNumber: 'PO-2026-0155',
    status: PurchaseOrderStatus.RECEIVED,
    subtotal: 110000,
    taxAmount: 19800,
    totalAmount: 129800,
    createdById: 'usr-proc',
    approvedById: 'usr-ceo',
    items: [
      { id: 'poi-002', purchaseOrderId: 'po-002', productId: 'prd-rm-alu', product: defaultProducts[0], quantity: 500, receivedQuantity: 500, unitPrice: 220, total: 110000 },
    ],
  },
];

const defaultGoodsReceipts = [
  {
    id: 'grn-001',
    organizationId: orgId,
    warehouseId: 'wh-del',
    purchaseOrderId: 'po-002',
    grnNumber: 'GRN-2026-0092',
    status: GoodsReceiptStatus.ACCEPTED,
    carrier: 'SafeX Logistics Cargo',
    trackingNumber: 'TRK-9821044',
    items: [{ id: 'grni-001', goodsReceiptId: 'grn-001', productId: 'prd-rm-alu', product: defaultProducts[0], orderedQuantity: 500, receivedQuantity: 500, acceptedQuantity: 500 }],
  },
];

const defaultBOMs = [
  {
    id: 'bom-inv',
    organizationId: orgId,
    finishedProductId: 'prd-fg-inv',
    finishedProduct: defaultProducts[5],
    bomNumber: 'BOM-INV-5K',
    name: 'Standard BOM - Smart Solar Inverter 5kVA',
    version: '2.1',
    standardBatchSize: 1,
    estimatedHours: 4.5,
    items: [
      { id: 'bomi-1', bomId: 'bom-inv', rawMaterialProductId: 'prd-rm-mcu', rawMaterial: defaultProducts[2], quantityPerUnit: 2, unitCost: 480 },
      { id: 'bomi-2', bomId: 'bom-inv', rawMaterialProductId: 'prd-rm-bat', rawMaterial: defaultProducts[3], quantityPerUnit: 4, unitCost: 1350 },
      { id: 'bomi-3', bomId: 'bom-inv', rawMaterialProductId: 'prd-rm-alu', rawMaterial: defaultProducts[0], quantityPerUnit: 12, unitCost: 220 },
      { id: 'bomi-4', bomId: 'bom-inv', rawMaterialProductId: 'prd-rm-fst', rawMaterial: defaultProducts[4], quantityPerUnit: 1, unitCost: 280 },
    ],
  },
  {
    id: 'bom-iot',
    organizationId: orgId,
    finishedProductId: 'prd-fg-iot',
    finishedProduct: defaultProducts[6],
    bomNumber: 'BOM-IOT-PRO',
    name: 'Standard BOM - Industrial Edge IoT Gateway Pro',
    version: '1.4',
    standardBatchSize: 1,
    estimatedHours: 2.0,
    items: [
      { id: 'bomi-5', bomId: 'bom-iot', rawMaterialProductId: 'prd-rm-mcu', rawMaterial: defaultProducts[2], quantityPerUnit: 1, unitCost: 480 },
      { id: 'bomi-6', bomId: 'bom-iot', rawMaterialProductId: 'prd-rm-alu', rawMaterial: defaultProducts[0], quantityPerUnit: 3, unitCost: 220 },
    ],
  },
];

const defaultWorkOrders = [
  {
    id: 'wo-001',
    organizationId: orgId,
    branchId: delhiBranchId,
    warehouseId: 'wh-del',
    workOrderNumber: 'WO-2026-0044',
    bomId: 'bom-inv',
    bom: defaultBOMs[0],
    finishedProductId: 'prd-fg-inv',
    finishedProduct: defaultProducts[5],
    targetQuantity: 20,
    producedQuantity: 12,
    status: WorkOrderStatus.IN_PROGRESS,
    priority: PriorityLevel.HIGH,
    startDate: now,
    dueDate: new Date(Date.now() + 7 * 86400000),
    totalCost: 470000,
    createdById: 'usr-mfg',
    operations: [
      { id: 'woo-1', workOrderId: 'wo-001', sequence: 1, operationName: 'PCB Assembly & Soldering', workstation: 'LINE-A-SMT', standardMinutes: 120, actualMinutes: 115, status: OperationStatus.COMPLETED },
      { id: 'woo-2', workOrderId: 'wo-001', sequence: 2, operationName: 'Inverter Casing & Heat Sink Mounting', workstation: 'LINE-B-ASSEMBLY', standardMinutes: 90, actualMinutes: 90, status: OperationStatus.COMPLETED },
      { id: 'woo-3', workOrderId: 'wo-001', sequence: 3, operationName: 'High Voltage Calibration & Testing', workstation: 'TEST-BENCH-02', standardMinutes: 60, actualMinutes: 40, status: OperationStatus.RUNNING },
      { id: 'woo-4', workOrderId: 'wo-001', sequence: 4, operationName: 'Final Packaging & Barcoding', workstation: 'PACKING-BAY-1', standardMinutes: 30, actualMinutes: 0, status: OperationStatus.PENDING },
    ],
  },
];

const defaultEmployees = [
  { id: 'emp-001', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-exec', department: defaultDepartments[0], employeeCode: 'EMP-001', firstName: 'Vikram', lastName: 'Sharma', email: 'admin@apex.com', designation: 'Managing Director & CIO', baseSalary: 280000, allowances: 45000, deductions: 32000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-002', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-exec', department: defaultDepartments[0], employeeCode: 'EMP-002', firstName: 'Rajesh', lastName: 'Singhania', email: 'ceo@apex.com', designation: 'Chief Executive Officer', baseSalary: 450000, allowances: 80000, deductions: 65000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-003', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-fin', department: defaultDepartments[1], employeeCode: 'EMP-003', firstName: 'Ananya', lastName: 'Iyer', email: 'finance@apex.com', designation: 'Chief Financial Officer', baseSalary: 220000, allowances: 35000, deductions: 28000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-004', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-hr', department: defaultDepartments[2], employeeCode: 'EMP-004', firstName: 'Priya', lastName: 'Nair', email: 'hr@apex.com', designation: 'Head of People Operations', baseSalary: 180000, allowances: 25000, deductions: 20000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-005', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-sales', department: defaultDepartments[3], employeeCode: 'EMP-005', firstName: 'Rohan', lastName: 'Verma', email: 'sales@apex.com', designation: 'VP - Enterprise Sales', baseSalary: 195000, allowances: 40000, deductions: 25000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-006', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-proc', department: defaultDepartments[4], employeeCode: 'EMP-006', firstName: 'Suresh', lastName: 'Patel', email: 'procurement@apex.com', designation: 'Director - Supply Chain', baseSalary: 175000, allowances: 25000, deductions: 22000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-007', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-inv', department: defaultDepartments[5], employeeCode: 'EMP-007', firstName: 'Manoj', lastName: 'Kumar', email: 'inventory@apex.com', designation: 'Warehouse Operations Manager', baseSalary: 130000, allowances: 18000, deductions: 15000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-008', organizationId: orgId, branchId: delhiBranchId, departmentId: 'dept-mfg', department: defaultDepartments[6], employeeCode: 'EMP-008', firstName: 'Arvind', lastName: 'Deshmukh', email: 'production@apex.com', designation: 'Plant Operations Head', baseSalary: 210000, allowances: 30000, deductions: 26000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-009', organizationId: orgId, branchId: blrBranchId, departmentId: 'dept-proj', department: defaultDepartments[7], employeeCode: 'EMP-009', firstName: 'Neha', lastName: 'Gupta', email: 'projects@apex.com', designation: 'Senior Technical Program Manager', baseSalary: 165000, allowances: 22000, deductions: 19000, status: EmployeeStatus.ACTIVE },
  { id: 'emp-010', organizationId: orgId, branchId: mumbaiBranchId, departmentId: 'dept-sales', department: defaultDepartments[3], employeeCode: 'EMP-010', firstName: 'Rahul', lastName: 'Joshi', email: 'employee@apex.com', designation: 'Key Account Executive', baseSalary: 75000, allowances: 12000, deductions: 8500, status: EmployeeStatus.ACTIVE },
];

const defaultAttendances = defaultEmployees.map((e, idx) => ({
  id: `att-${idx + 1}`,
  organizationId: orgId,
  employeeId: e.id,
  employee: e,
  date: today,
  checkIn: new Date(Date.now() - 4 * 3600000),
  status: idx === 9 ? AttendanceStatus.WORK_FROM_HOME : AttendanceStatus.PRESENT,
  workingHours: 8,
}));

const defaultPayrollRuns = [
  {
    id: 'pr-sep-2026',
    organizationId: orgId,
    month: 9,
    year: 2026,
    status: PayrollStatus.APPROVED,
    totalGrossSalary: 2080000,
    totalAllowances: 332000,
    totalDeductions: 260500,
    totalNetSalary: 2151500,
    employeeCount: 10,
    approvedById: 'usr-ceo',
    approvedAt: new Date(2026, 9, 2),
    disbursedAt: new Date(2026, 9, 3),
  },
];

const defaultBudgets = deptData.map((d) => ({
  id: `bud-${d.code}-2026`,
  organizationId: orgId,
  departmentId: d.id,
  department: defaultDepartments.find((dep) => dep.id === d.id),
  fiscalYear: 2026,
  allocatedAmount: d.budget,
  spentAmount: Math.floor(d.budget * 0.45),
  remainingAmount: d.budget - Math.floor(d.budget * 0.45),
}));

const defaultApprovals = [
  {
    id: 'app-001',
    organizationId: orgId,
    requestedById: 'usr-proc',
    approverId: 'usr-ceo',
    module: 'PROCUREMENT',
    entityType: 'PURCHASE_ORDER',
    entityId: 'po-001',
    title: 'Approve PO-2026-0182 for 200 units LiFePO4 Battery Cells',
    description: 'Critical replenishment for manufacturing line 2. Total: ₹3,18,600',
    amount: 318600,
    status: ApprovalStatus.PENDING,
    createdAt: now,
  },
  {
    id: 'app-002',
    organizationId: orgId,
    requestedById: 'usr-hr',
    approverId: 'usr-fin',
    module: 'HRMS',
    entityType: 'PAYROLL_RUN',
    entityId: 'pr-sep-2026',
    title: 'October 2026 Advance Bonus Disbursement',
    description: 'Festive Diwali advance payment request for plant engineers',
    amount: 450000,
    status: ApprovalStatus.PENDING,
    createdAt: now,
  },
];

const defaultProjects = [
  {
    id: 'prj-001',
    organizationId: orgId,
    customerId: 'cust-001',
    customer: defaultCustomers[0],
    code: 'PRJ-2026-GRID',
    name: 'Smart Grid & Renewable Microstation Phase 2',
    description: 'Design and deployment of hybrid 5kVA solar inverters and IoT gateways',
    status: ProjectStatus.ACTIVE,
    priority: PriorityLevel.HIGH,
    startDate: new Date(2026, 4, 1),
    endDate: new Date(2026, 11, 31),
    budget: 4500000,
    spentCost: 1850000,
    billingType: BillingType.FIXED_PRICE,
    managerId: 'usr-proj',
    tasks: [
      { id: 'tsk-001', projectId: 'prj-001', title: 'Deploy Telematics Firmware v2.1 on 50 Edge Gateways', priority: PriorityLevel.HIGH, status: TaskStatus.IN_PROGRESS, estimatedHours: 40, actualHours: 24, dueDate: new Date(Date.now() + 4 * 86400000) },
    ],
  },
];

const defaultSupportTickets = [
  {
    id: 'tck-001',
    organizationId: orgId,
    customerId: 'cust-002',
    customer: defaultCustomers[1],
    ticketNumber: 'TCK-2026-1049',
    subject: 'Inverter telemetry telemetry packet loss on Remote Substation 4',
    description: 'Customer reports 15% packet drop over cellular 4G backhaul.',
    priority: PriorityLevel.HIGH,
    status: TicketStatus.IN_PROGRESS,
    category: TicketCategory.TECHNICAL,
    assignedToId: 'usr-proj',
    createdAt: now,
    messages: [
      { id: 'msg-01', senderType: 'CUSTOMER', message: 'Noticing irregular heartbeat telemetry packets since yesterday.', createdAt: now },
    ],
  },
];

const defaultAuditLogs = [
  { id: 'aud-01', organizationId: orgId, userId: 'usr-sales', entity: 'SalesOrder', entityId: 'so-001', action: 'CONFIRM_SALES_ORDER', newData: { orderNumber: 'SO-2026-0891', total: 494420 }, createdAt: now },
  { id: 'aud-02', organizationId: orgId, userId: 'usr-mfg', entity: 'WorkOrder', entityId: 'wo-001', action: 'RELEASE_WORK_ORDER', newData: { workOrderNumber: 'WO-2026-0044', targetQuantity: 20 }, createdAt: now },
];

export const inMemoryDb: any = {
  organization: new MemoryCollection([defaultOrg]),
  branch: new MemoryCollection(defaultBranches),
  department: new MemoryCollection(defaultDepartments),
  user: new MemoryCollection(defaultUsers),
  account: new MemoryCollection(defaultAccounts),
  warehouse: new MemoryCollection(defaultWarehouses),
  category: new MemoryCollection(defaultCategories),
  product: new MemoryCollection(defaultProducts),
  stockLevel: new MemoryCollection([]),
  billOfMaterials: new MemoryCollection(defaultBOMs),
  bOM: new MemoryCollection(defaultBOMs),
  bOMItem: new MemoryCollection(defaultBOMs.flatMap((b) => b.items)),
  vendor: new MemoryCollection(defaultVendors),
  customer: new MemoryCollection(defaultCustomers),
  lead: new MemoryCollection([
    { id: 'lead-01', organizationId: orgId, name: 'Adani Green Energy Solar Farm Phase 3', company: 'Adani Green', estimatedValue: 3500000, status: 'QUALIFIED', source: 'Industry Expo 2026' },
    { id: 'lead-02', organizationId: orgId, name: 'Delhi Metro Smart Substation Project', company: 'DMRC Infrastructure', estimatedValue: 4800000, status: 'PROPOSAL_SENT', source: 'Government Tender' },
    { id: 'lead-03', organizationId: orgId, name: 'EV Fleet Charging Hub Navi Mumbai', company: 'BluSmart Mobility', estimatedValue: 2400000, status: 'CONTACTED', source: 'Website Inbound' },
  ]),
  salesOrder: new MemoryCollection(defaultSalesOrders),
  salesOrderItem: new MemoryCollection(defaultSalesOrders.flatMap((s) => s.items)),
  invoice: new MemoryCollection(defaultInvoices),
  payment: new MemoryCollection(defaultPayments),
  purchaseOrder: new MemoryCollection(defaultPurchaseOrders),
  purchaseOrderItem: new MemoryCollection(defaultPurchaseOrders.flatMap((p) => p.items)),
  purchaseRequisition: new MemoryCollection([
    { id: 'pr-001', organizationId: orgId, requisitionNumber: 'PR-2026-0041', title: 'Silicon Microcontrollers SMT Buffer Restock', status: 'APPROVED', totalEstimatedCost: 192000, departmentId: 'dept-proc' },
  ]),
  goodsReceipt: new MemoryCollection(defaultGoodsReceipts),
  workOrder: new MemoryCollection(defaultWorkOrders),
  workOrderOperation: new MemoryCollection(defaultWorkOrders.flatMap((w) => w.operations)),
  employee: new MemoryCollection(defaultEmployees),
  attendance: new MemoryCollection(defaultAttendances),
  payrollRun: new MemoryCollection(defaultPayrollRuns),
  payslip: new MemoryCollection([]),
  budget: new MemoryCollection(defaultBudgets),
  expense: new MemoryCollection([
    { id: 'exp-01', organizationId: orgId, departmentId: 'dept-sales', department: defaultDepartments[3], amount: 45000, description: 'Client Hospitality & Demo Expo Travel', status: 'APPROVED', date: now },
  ]),
  project: new MemoryCollection(defaultProjects),
  projectTask: new MemoryCollection(defaultProjects.flatMap((p) => p.tasks)),
  task: new MemoryCollection(defaultProjects.flatMap((p) => p.tasks)),
  supportTicket: new MemoryCollection(defaultSupportTickets),
  approvalRequest: new MemoryCollection(defaultApprovals),
  auditLog: new MemoryCollection(defaultAuditLogs),
  inventoryReservation: new MemoryCollection([]),
  stockMovement: new MemoryCollection([]),
  journalEntry: new MemoryCollection([]),
  journalLine: new MemoryCollection([]),

  async $transaction(arg: any): Promise<any> {
    if (typeof arg === 'function') {
      return await arg(inMemoryDb);
    }
    return await Promise.all(arg);
  },
};
