import { PrismaClient, UserRole, ProductType, SalesOrderStatus, PaymentStatus, InvoiceStatus, PaymentMethod, RequisitionStatus, PriorityLevel, PurchaseOrderStatus, GoodsReceiptStatus, WorkOrderStatus, OperationStatus, AccountType, AccountSubType, JournalStatus, ExpenseStatus, EmploymentType, EmployeeStatus, AttendanceStatus, ApprovalStatus, PayrollStatus, ProjectStatus, BillingType, TaskStatus, TicketStatus, TicketCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Apex AI Voice ERP database with comprehensive enterprise records...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'APEX-GLOBAL' },
    update: {},
    create: {
      name: 'Apex Global Industries Ltd.',
      code: 'APEX-GLOBAL',
      currency: 'INR',
      taxId: 'GSTIN27AABCA1234F1Z5',
      address: 'Apex Tower, Bandra Kurla Complex, Bandra East',
      phone: '+91 22 6789 5000',
      email: 'contact@apexglobal.com',
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // 2. Branches
  const mumbaiHQ = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MUM-HQ' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Mumbai Corporate Headquarters',
      code: 'MUM-HQ',
      address: 'BKC Business Hub',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      isHQ: true,
    },
  });

  const delhiPlant = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEL-PLANT' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Delhi Manufacturing Facility',
      code: 'DEL-PLANT',
      address: 'Okhla Industrial Area Phase III',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      isHQ: false,
    },
  });

  const blrTech = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'BLR-TECH' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Bengaluru Tech & R&D Hub',
      code: 'BLR-TECH',
      address: 'Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isHQ: false,
    },
  });

  // 3. Departments
  const deptData = [
    { name: 'Executive Leadership', code: 'EXEC', budget: 1500000 },
    { name: 'Finance & Accounts', code: 'FIN', budget: 2500000 },
    { name: 'Human Resources', code: 'HR', budget: 1200000 },
    { name: 'Sales & Marketing', code: 'SALES', budget: 3000000 },
    { name: 'Procurement & SCM', code: 'PROC', budget: 5000000 },
    { name: 'Inventory & Warehousing', code: 'INV', budget: 2000000 },
    { name: 'Manufacturing & Engineering', code: 'MFG', budget: 7500000 },
    { name: 'Projects & Delivery', code: 'PROJ', budget: 3500000 },
    { name: 'Customer Support', code: 'SUPP', budget: 1000000 },
  ];

  const depts: Record<string, any> = {};
  for (const d of deptData) {
    depts[d.code] = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: { budget: d.budget },
      create: {
        organizationId: org.id,
        name: d.name,
        code: d.code,
        budget: d.budget,
      },
    });

    // Department budget record for FY 2026
    await prisma.budget.upsert({
      where: { organizationId_departmentId_fiscalYear: { organizationId: org.id, departmentId: depts[d.code].id, fiscalYear: 2026 } },
      update: {},
      create: {
        organizationId: org.id,
        departmentId: depts[d.code].id,
        fiscalYear: 2026,
        allocatedAmount: d.budget,
        spentAmount: Math.floor(d.budget * 0.45),
        remainingAmount: d.budget - Math.floor(d.budget * 0.45),
      },
    });
  }

  // 4. Users across 10 Roles
  const usersData = [
    { email: 'admin@apex.com', name: 'Vikram Sharma', role: UserRole.SUPER_ADMIN, branchId: mumbaiHQ.id, dept: 'EXEC' },
    { email: 'ceo@apex.com', name: 'Rajesh Singhania', role: UserRole.CEO, branchId: mumbaiHQ.id, dept: 'EXEC' },
    { email: 'finance@apex.com', name: 'Ananya Iyer', role: UserRole.FINANCE_MANAGER, branchId: mumbaiHQ.id, dept: 'FIN' },
    { email: 'hr@apex.com', name: 'Priya Nair', role: UserRole.HR_MANAGER, branchId: mumbaiHQ.id, dept: 'HR' },
    { email: 'sales@apex.com', name: 'Rohan Verma', role: UserRole.SALES_MANAGER, branchId: mumbaiHQ.id, dept: 'SALES' },
    { email: 'procurement@apex.com', name: 'Suresh Patel', role: UserRole.PROCUREMENT_MANAGER, branchId: delhiPlant.id, dept: 'PROC' },
    { email: 'inventory@apex.com', name: 'Manoj Kumar', role: UserRole.INVENTORY_MANAGER, branchId: delhiPlant.id, dept: 'INV' },
    { email: 'production@apex.com', name: 'Arvind Deshmukh', role: UserRole.PRODUCTION_MANAGER, branchId: delhiPlant.id, dept: 'MFG' },
    { email: 'projects@apex.com', name: 'Neha Gupta', role: UserRole.PROJECT_MANAGER, branchId: blrTech.id, dept: 'PROJ' },
    { email: 'employee@apex.com', name: 'Rahul Joshi', role: UserRole.EMPLOYEE, branchId: mumbaiHQ.id, dept: 'SALES' },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: {
        organizationId: org.id,
        branchId: u.branchId,
        departmentId: depts[u.dept].id,
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: 'apex2026',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
      },
    });
  }

  // 5. Chart of Accounts (Double-Entry Bookkeeping)
  const coa = [
    { code: '1010', name: 'Cash on Hand', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 350000 },
    { code: '1020', name: 'HDFC Bank Operating Account', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 14850000 },
    { code: '1030', name: 'Accounts Receivable (Trade Debtors)', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 2650000 },
    { code: '1040', name: 'Raw Materials Inventory', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 4120000 },
    { code: '1050', name: 'Finished Goods Inventory', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, balance: 7850000 },
    { code: '1500', name: 'Plant, Machinery & Equipment', type: AccountType.ASSET, subType: AccountSubType.NON_CURRENT_ASSET, balance: 18500000 },
    { code: '2010', name: 'Accounts Payable (Trade Creditors)', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, balance: 3820000 },
    { code: '2020', name: 'Accrued Payroll & Statutory Dues', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, balance: 940000 },
    { code: '3010', name: 'Shareholder Capital & Equity', type: AccountType.EQUITY, subType: AccountSubType.EQUITY, balance: 30000000 },
    { code: '4010', name: 'Industrial Equipment Sales Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, balance: 28400000 },
    { code: '4020', name: 'Project Engineering Services Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, balance: 8200000 },
    { code: '5010', name: 'Cost of Raw Materials Consumed', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, balance: 14200000 },
    { code: '5020', name: 'Direct Manufacturing Labor', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, balance: 3100000 },
    { code: '6010', name: 'Employee Salaries & Allowances', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 5400000 },
    { code: '6020', name: 'Facility Rent & Utilities', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 1250000 },
    { code: '6030', name: 'Sales, Marketing & Travel', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, balance: 890000 },
  ];

  const accounts: Record<string, any> = {};
  for (const acc of coa) {
    accounts[acc.code] = await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: acc.code } },
      update: { balance: acc.balance },
      create: {
        organizationId: org.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        balance: acc.balance,
      },
    });
  }

  // 6. Warehouses
  const mumWH = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-MUM-01' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mumbaiHQ.id,
      code: 'WH-MUM-01',
      name: 'Mumbai Central Distribution Center',
      city: 'Navi Mumbai',
      address: 'Plot 44, MIDC Industrial Area',
    },
  });

  const delWH = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-DEL-01' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: delhiPlant.id,
      code: 'WH-DEL-01',
      name: 'Delhi Manufacturing Materials Depot',
      city: 'New Delhi',
      address: 'Okhla Phase III Logistics Zone',
    },
  });

  const blrWH = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-BLR-01' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: blrTech.id,
      code: 'WH-BLR-01',
      name: 'Bengaluru Tech Logistics Hub',
      city: 'Bengaluru',
      address: 'Electronic City Sector 2',
    },
  });

  // 7. Categories & Products (Raw materials & Finished goods)
  const catRaw = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Raw Materials & Components' } },
    update: {},
    create: { organizationId: org.id, name: 'Raw Materials & Components', description: 'Metals, semiconductors and passive parts' },
  });

  const catFG = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Finished Industrial Goods' } },
    update: {},
    create: { organizationId: org.id, name: 'Finished Industrial Goods', description: 'Power equipment, IoT controllers and commercial EV systems' },
  });

  const productsData = [
    // Raw Materials
    {
      sku: 'RM-ALU-01',
      name: 'Aluminum Alloy Ingot 6061-T6',
      description: 'Aerospace/Industrial grade extruded aluminum ingot',
      unit: 'KG',
      type: ProductType.RAW_MATERIAL,
      costPrice: 220,
      sellingPrice: 0,
      minStock: 100,
      reorder: 250,
      stock: 520,
      reserved: 50,
      catId: catRaw.id,
      whId: delWH.id,
    },
    {
      sku: 'RM-STL-12',
      name: 'Industrial Steel Rod 12mm High-Tensile',
      description: 'Hardened chrome structural reinforcement rod',
      unit: 'MTR',
      type: ProductType.RAW_MATERIAL,
      costPrice: 340,
      sellingPrice: 0,
      minStock: 200,
      reorder: 350,
      stock: 140, // LOW STOCK!
      reserved: 20,
      catId: catRaw.id,
      whId: delWH.id,
    },
    {
      sku: 'RM-MCU-32',
      name: 'STM32 Microcontroller IC 32-bit Cortex',
      description: 'Ultra-low power industrial embedded controller chip',
      unit: 'PCS',
      type: ProductType.RAW_MATERIAL,
      costPrice: 480,
      sellingPrice: 0,
      minStock: 150,
      reorder: 300,
      stock: 85, // LOW STOCK!
      reserved: 30,
      catId: catRaw.id,
      whId: blrWH.id,
    },
    {
      sku: 'RM-BAT-48',
      name: 'Lithium Iron Phosphate (LiFePO4) 48V Cell',
      description: 'High discharge thermal stable battery module cell',
      unit: 'PCS',
      type: ProductType.RAW_MATERIAL,
      costPrice: 1350,
      sellingPrice: 0,
      minStock: 100,
      reorder: 200,
      stock: 45, // CRITICAL LOW STOCK!
      reserved: 15,
      catId: catRaw.id,
      whId: delWH.id,
    },
    {
      sku: 'RM-FST-08',
      name: 'Stainless Steel Fasteners Pack M8x40',
      description: 'Anti-corrosion stainless fasteners pack (100 pcs)',
      unit: 'BOX',
      type: ProductType.RAW_MATERIAL,
      costPrice: 280,
      sellingPrice: 0,
      minStock: 50,
      reorder: 100,
      stock: 310,
      reserved: 10,
      catId: catRaw.id,
      whId: delWH.id,
    },
    // Finished Goods
    {
      sku: 'FG-INV-5K',
      name: 'Smart Hybrid Solar Inverter 5kVA Pro',
      description: 'Grid-interactive hybrid inverter with MPPT and Wi-Fi sync',
      unit: 'PCS',
      type: ProductType.FINISHED_GOOD,
      costPrice: 23500,
      sellingPrice: 41900,
      minStock: 15,
      reorder: 30,
      stock: 38,
      reserved: 12,
      catId: catFG.id,
      whId: mumWH.id,
    },
    {
      sku: 'FG-IOT-PRO',
      name: 'Industrial Edge IoT Gateway Pro',
      description: 'Rugged DIN-rail edge computing telematics gateway',
      unit: 'PCS',
      type: ProductType.FINISHED_GOOD,
      costPrice: 8900,
      sellingPrice: 17500,
      minStock: 25,
      reorder: 50,
      stock: 64,
      reserved: 14,
      catId: catFG.id,
      whId: blrWH.id,
    },
    {
      sku: 'FG-APD-100',
      name: 'Automated Power Distribution Panel 100A',
      description: 'Microprocessor based automatic changeover breaker unit',
      unit: 'PCS',
      type: ProductType.FINISHED_GOOD,
      costPrice: 44000,
      sellingPrice: 76500,
      minStock: 10,
      reorder: 20,
      stock: 18,
      reserved: 4,
      catId: catFG.id,
      whId: mumWH.id,
    },
    {
      sku: 'FG-EVC-22',
      name: 'Commercial Dual-Gun EV Fast Charger 22kW',
      description: 'OCPP 2.0.1 compliant commercial electric vehicle AC charger',
      unit: 'PCS',
      type: ProductType.FINISHED_GOOD,
      costPrice: 36000,
      sellingPrice: 64900,
      minStock: 10,
      reorder: 25,
      stock: 8, // LOW STOCK!
      reserved: 6,
      catId: catFG.id,
      whId: mumWH.id,
    },
  ];

  const products: Record<string, any> = {};
  for (const p of productsData) {
    products[p.sku] = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: p.sku } },
      update: {
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.stock,
        reservedStock: p.reserved,
        availableStock: p.stock - p.reserved,
      },
      create: {
        organizationId: org.id,
        categoryId: p.catId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        unit: p.unit,
        type: p.type,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        minStockLevel: p.minStock,
        reorderPoint: p.reorder,
        currentStock: p.stock,
        reservedStock: p.reserved,
        availableStock: p.stock - p.reserved,
      },
    });

    // Stock level in warehouse
    await prisma.stockLevel.upsert({
      where: {
        warehouseId_productId_batchNumber: {
          warehouseId: p.whId,
          productId: products[p.sku].id,
          batchNumber: 'BATCH-2026-A1',
        },
      },
      update: { quantity: p.stock, reservedQuantity: p.reserved },
      create: {
        warehouseId: p.whId,
        productId: products[p.sku].id,
        batchNumber: 'BATCH-2026-A1',
        binLocation: 'BAY-04-SHELF-B',
        quantity: p.stock,
        reservedQuantity: p.reserved,
      },
    });
  }

  // 8. Bill of Materials (BOM) for Inverter & IoT Gateway
  const bomInverter = await prisma.billOfMaterials.upsert({
    where: { organizationId_bomNumber: { organizationId: org.id, bomNumber: 'BOM-INV-5K' } },
    update: {},
    create: {
      organizationId: org.id,
      finishedProductId: products['FG-INV-5K'].id,
      bomNumber: 'BOM-INV-5K',
      name: 'Standard BOM - Smart Solar Inverter 5kVA',
      version: '2.1',
      standardBatchSize: 1,
      estimatedHours: 4.5,
    },
  });

  await prisma.bOMItem.deleteMany({ where: { bomId: bomInverter.id } });
  await prisma.bOMItem.createMany({
    data: [
      { bomId: bomInverter.id, rawMaterialProductId: products['RM-MCU-32'].id, quantityPerUnit: 2, unitCost: 480 },
      { bomId: bomInverter.id, rawMaterialProductId: products['RM-BAT-48'].id, quantityPerUnit: 4, unitCost: 1350 },
      { bomId: bomInverter.id, rawMaterialProductId: products['RM-ALU-01'].id, quantityPerUnit: 12, unitCost: 220 },
      { bomId: bomInverter.id, rawMaterialProductId: products['RM-FST-08'].id, quantityPerUnit: 1, unitCost: 280 },
    ],
  });

  const bomIoT = await prisma.billOfMaterials.upsert({
    where: { organizationId_bomNumber: { organizationId: org.id, bomNumber: 'BOM-IOT-PRO' } },
    update: {},
    create: {
      organizationId: org.id,
      finishedProductId: products['FG-IOT-PRO'].id,
      bomNumber: 'BOM-IOT-PRO',
      name: 'Standard BOM - Industrial Edge IoT Gateway Pro',
      version: '1.4',
      standardBatchSize: 1,
      estimatedHours: 2.0,
    },
  });

  await prisma.bOMItem.deleteMany({ where: { bomId: bomIoT.id } });
  await prisma.bOMItem.createMany({
    data: [
      { bomId: bomIoT.id, rawMaterialProductId: products['RM-MCU-32'].id, quantityPerUnit: 1, unitCost: 480 },
      { bomId: bomIoT.id, rawMaterialProductId: products['RM-ALU-01'].id, quantityPerUnit: 3, unitCost: 220 },
      { bomId: bomIoT.id, rawMaterialProductId: products['RM-FST-08'].id, quantityPerUnit: 0.5, unitCost: 280 },
    ],
  });

  // 9. Vendors
  const vendorsData = [
    { code: 'VND-001', name: 'Bharat Steel & Metal Alloys Ltd.', contact: 'Harish Mehta', email: 'sales@bharatsteel.com', phone: '+91 22 4099 8877', tax: '27AAACB2233M1Z2', rating: 4.8 },
    { code: 'VND-002', name: 'Silicon Semi Electronics Pvt Ltd', contact: 'Karthik Raman', email: 'orders@siliconsemi.in', phone: '+91 80 2345 6789', tax: '29AABCS8899K1Z4', rating: 4.9 },
    { code: 'VND-003', name: 'Apex Energy Cells & Storage Systems', contact: 'Sunil Rao', email: 'supply@apexcells.com', phone: '+91 265 244 5566', tax: '24AACCA7766P1Z3', rating: 4.6 },
    { code: 'VND-004', name: 'Precision Fasteners & Hardware Corp', contact: 'Naveen Jain', email: 'fasteners@precisioncorp.in', phone: '+91 11 2877 3456', tax: '07AAECP1122D1Z1', rating: 4.7 },
  ];

  const vendors: Record<string, any> = {};
  for (const v of vendorsData) {
    vendors[v.code] = await prisma.vendor.upsert({
      where: { organizationId_code: { organizationId: org.id, code: v.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: v.code,
        name: v.name,
        contactPerson: v.contact,
        email: v.email,
        phone: v.phone,
        taxNumber: v.tax,
        rating: v.rating,
      },
    });
  }

  // 10. Customers & CRM Leads
  const customersData = [
    { code: 'CUST-001', name: 'Tata Power Renewable Energy Ltd.', email: 'procurement@tatapowerrenewables.com', phone: '+91 22 6665 8282', credit: 5000000, out: 840000 },
    { code: 'CUST-002', name: 'Larsen & Toubro Heavy Infrastructure', email: 'vendor.desk@larsentoubro.com', phone: '+91 22 6752 5656', credit: 7500000, out: 1450000 },
    { code: 'CUST-003', name: 'Reliance Green Energy Solutions', email: 'solar.buying@ril.com', phone: '+91 22 3555 5000', credit: 10000000, out: 360000 },
    { code: 'CUST-004', name: 'Mahindra Logistics Park Operations', email: 'facility.tech@mahindra.com', phone: '+91 22 2846 8000', credit: 3000000, out: 0 },
  ];

  const customers: Record<string, any> = {};
  for (const c of customersData) {
    customers[c.code] = await prisma.customer.upsert({
      where: { organizationId_code: { organizationId: org.id, code: c.code } },
      update: { outstandingBalance: c.out },
      create: {
        organizationId: org.id,
        code: c.code,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.name,
        creditLimit: c.credit,
        outstandingBalance: c.out,
      },
    });
  }

  // CRM Leads
  await prisma.lead.createMany({
    data: [
      { organizationId: org.id, name: 'Adani Green Energy Solar Farm Phase 3', company: 'Adani Green', estimatedValue: 3500000, status: 'QUALIFIED', source: 'Industry Expo 2026' },
      { organizationId: org.id, name: 'Delhi Metro Smart Substation Project', company: 'DMRC Infrastructure', estimatedValue: 4800000, status: 'PROPOSAL_SENT', source: 'Government Tender' },
      { organizationId: org.id, name: 'EV Fleet Charging Hub Navi Mumbai', company: 'BluSmart Mobility', estimatedValue: 2400000, status: 'CONTACTED', source: 'Website Inbound' },
    ],
    skipDuplicates: true,
  });

  // 11. Sales Orders & Invoices (Order-to-Cash Demonstration)
  const so1 = await prisma.salesOrder.upsert({
    where: { organizationId_orderNumber: { organizationId: org.id, orderNumber: 'SO-2026-0891' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mumbaiHQ.id,
      orderNumber: 'SO-2026-0891',
      customerId: customers['CUST-001'].id,
      status: SalesOrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PARTIAL,
      subtotal: 419000,
      taxAmount: 75420,
      totalAmount: 494420,
      createdById: users['sales@apex.com'].id,
      confirmedAt: new Date(),
      items: {
        create: [
          { productId: products['FG-INV-5K'].id, quantity: 10, reservedQuantity: 10, unitPrice: 41900, total: 419000 },
        ],
      },
    },
  });

  const inv1 = await prisma.invoice.upsert({
    where: { organizationId_invoiceNumber: { organizationId: org.id, invoiceNumber: 'INV-2026-0891' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mumbaiHQ.id,
      invoiceNumber: 'INV-2026-0891',
      salesOrderId: so1.id,
      customerId: customers['CUST-001'].id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: InvoiceStatus.PARTIALLY_PAID,
      subtotal: 419000,
      taxAmount: 75420,
      totalAmount: 494420,
      paidAmount: 250000,
      balanceDue: 244420,
    },
  });

  await prisma.payment.upsert({
    where: { organizationId_paymentNumber: { organizationId: org.id, paymentNumber: 'PAY-2026-0412' } },
    update: {},
    create: {
      organizationId: org.id,
      paymentNumber: 'PAY-2026-0412',
      invoiceId: inv1.id,
      customerId: customers['CUST-001'].id,
      amount: 250000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'HDFC-NEFT-99881122',
      createdById: users['finance@apex.com'].id,
    },
  });

  // Another Sales Order Delivered & Overdue Invoice
  const so2 = await prisma.salesOrder.upsert({
    where: { organizationId_orderNumber: { organizationId: org.id, orderNumber: 'SO-2026-0740' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mumbaiHQ.id,
      orderNumber: 'SO-2026-0740',
      customerId: customers['CUST-002'].id,
      status: SalesOrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 262500,
      taxAmount: 47250,
      totalAmount: 309750,
      createdById: users['sales@apex.com'].id,
      confirmedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: products['FG-IOT-PRO'].id, quantity: 15, reservedQuantity: 0, unitPrice: 17500, total: 262500 },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { organizationId_invoiceNumber: { organizationId: org.id, invoiceNumber: 'INV-2026-0740' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mumbaiHQ.id,
      invoiceNumber: 'INV-2026-0740',
      salesOrderId: so2.id,
      customerId: customers['CUST-002'].id,
      issueDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // OVERDUE!
      status: InvoiceStatus.OVERDUE,
      subtotal: 262500,
      taxAmount: 47250,
      totalAmount: 309750,
      paidAmount: 0,
      balanceDue: 309750,
      notes: 'Payment overdue by 5 days. Reminders dispatched.',
    },
  });

  // 12. Procurement & Goods Receipts (Procure-to-Pay Demonstration)
  const po1 = await prisma.purchaseOrder.upsert({
    where: { organizationId_poNumber: { organizationId: org.id, poNumber: 'PO-2026-0182' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: delhiPlant.id,
      vendorId: vendors['VND-003'].id,
      poNumber: 'PO-2026-0182',
      status: PurchaseOrderStatus.ISSUED,
      subtotal: 270000,
      taxAmount: 48600,
      totalAmount: 318600,
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdById: users['procurement@apex.com'].id,
      approvedById: users['ceo@apex.com'].id,
      approvedAt: new Date(),
      items: {
        create: [
          { productId: products['RM-BAT-48'].id, quantity: 200, unitPrice: 1350, total: 270000 },
        ],
      },
    },
  });

  // Completed PO with Goods Receipt
  const po2 = await prisma.purchaseOrder.upsert({
    where: { organizationId_poNumber: { organizationId: org.id, poNumber: 'PO-2026-0155' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: delhiPlant.id,
      vendorId: vendors['VND-001'].id,
      poNumber: 'PO-2026-0155',
      status: PurchaseOrderStatus.RECEIVED,
      subtotal: 110000,
      taxAmount: 19800,
      totalAmount: 129800,
      createdById: users['procurement@apex.com'].id,
      approvedById: users['ceo@apex.com'].id,
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: products['RM-ALU-01'].id, quantity: 500, receivedQuantity: 500, unitPrice: 220, total: 110000 },
        ],
      },
    },
  });

  await prisma.goodsReceipt.upsert({
    where: { organizationId_grnNumber: { organizationId: org.id, grnNumber: 'GRN-2026-0092' } },
    update: {},
    create: {
      organizationId: org.id,
      warehouseId: delWH.id,
      purchaseOrderId: po2.id,
      grnNumber: 'GRN-2026-0092',
      status: GoodsReceiptStatus.ACCEPTED,
      carrier: 'SafeX Logistics Cargo',
      trackingNumber: 'TRK-9821044',
      items: {
        create: [
          { productId: products['RM-ALU-01'].id, orderedQuantity: 500, receivedQuantity: 500, acceptedQuantity: 500 },
        ],
      },
    },
  });

  // 13. Manufacturing Work Orders (Plan-to-Produce Demonstration)
  const wo1 = await prisma.workOrder.upsert({
    where: { organizationId_workOrderNumber: { organizationId: org.id, workOrderNumber: 'WO-2026-0044' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: delhiPlant.id,
      warehouseId: delWH.id,
      workOrderNumber: 'WO-2026-0044',
      bomId: bomInverter.id,
      finishedProductId: products['FG-INV-5K'].id,
      targetQuantity: 20,
      producedQuantity: 12,
      status: WorkOrderStatus.IN_PROGRESS,
      priority: PriorityLevel.HIGH,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalCost: 470000,
      createdById: users['production@apex.com'].id,
      operations: {
        create: [
          { sequence: 1, operationName: 'PCB Assembly & Soldering', workstation: 'LINE-A-SMT', standardMinutes: 120, actualMinutes: 115, status: OperationStatus.COMPLETED },
          { sequence: 2, operationName: 'Inverter Casing & Heat Sink Mounting', workstation: 'LINE-B-ASSEMBLY', standardMinutes: 90, actualMinutes: 90, status: OperationStatus.COMPLETED },
          { sequence: 3, operationName: 'High Voltage Calibration & Testing', workstation: 'TEST-BENCH-02', standardMinutes: 60, actualMinutes: 40, status: OperationStatus.RUNNING },
          { sequence: 4, operationName: 'Final Packaging & Barcoding', workstation: 'PACKING-BAY-1', standardMinutes: 30, actualMinutes: 0, status: OperationStatus.PENDING },
        ],
      },
    },
  });

  // 14. Employees, Attendance & Payroll (Hire-to-Retire Demonstration)
  const empProfiles = [
    { code: 'EMP-001', first: 'Vikram', last: 'Sharma', email: 'admin@apex.com', desig: 'Managing Director & CIO', base: 280000, allow: 45000, ded: 32000, dept: 'EXEC' },
    { code: 'EMP-002', first: 'Rajesh', last: 'Singhania', email: 'ceo@apex.com', desig: 'Chief Executive Officer', base: 450000, allow: 80000, ded: 65000, dept: 'EXEC' },
    { code: 'EMP-003', first: 'Ananya', last: 'Iyer', email: 'finance@apex.com', desig: 'Chief Financial Officer', base: 220000, allow: 35000, ded: 28000, dept: 'FIN' },
    { code: 'EMP-004', first: 'Priya', last: 'Nair', email: 'hr@apex.com', desig: 'Head of People Operations', base: 180000, allow: 25000, ded: 20000, dept: 'HR' },
    { code: 'EMP-005', first: 'Rohan', last: 'Verma', email: 'sales@apex.com', desig: 'VP - Enterprise Sales', base: 195000, allow: 40000, ded: 25000, dept: 'SALES' },
    { code: 'EMP-006', first: 'Suresh', last: 'Patel', email: 'procurement@apex.com', desig: 'Director - Supply Chain & Procurement', base: 175000, allow: 25000, ded: 22000, dept: 'PROC' },
    { code: 'EMP-007', first: 'Manoj', last: 'Kumar', email: 'inventory@apex.com', desig: 'Warehouse Operations Manager', base: 130000, allow: 18000, ded: 15000, dept: 'INV' },
    { code: 'EMP-008', first: 'Arvind', last: 'Deshmukh', email: 'production@apex.com', desig: 'Plant Operations Head', base: 210000, allow: 30000, ded: 26000, dept: 'MFG' },
    { code: 'EMP-009', first: 'Neha', last: 'Gupta', email: 'projects@apex.com', desig: 'Senior Technical Program Manager', base: 165000, allow: 22000, ded: 19000, dept: 'PROJ' },
    { code: 'EMP-010', first: 'Rahul', last: 'Joshi', email: 'employee@apex.com', desig: 'Key Account Executive', base: 75000, allow: 12000, ded: 8500, dept: 'SALES' },
  ];

  const employees: Record<string, any> = {};
  for (const ep of empProfiles) {
    const userRec = users[ep.email];
    employees[ep.code] = await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: ep.code } },
      update: {
        baseSalary: ep.base,
        allowances: ep.allow,
        deductions: ep.ded,
      },
      create: {
        organizationId: org.id,
        branchId: mumbaiHQ.id,
        departmentId: depts[ep.dept].id,
        userId: userRec ? userRec.id : undefined,
        employeeCode: ep.code,
        firstName: ep.first,
        lastName: ep.last,
        email: ep.email,
        designation: ep.desig,
        dateOfJoining: new Date(2022, 1, 15),
        baseSalary: ep.base,
        allowances: ep.allow,
        deductions: ep.ded,
        bankAccount: 'HDFC00018273645',
        panNumber: 'ABCDE1234F',
        status: EmployeeStatus.ACTIVE,
      },
    });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employees[ep.code].id,
          date: today,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        employeeId: employees[ep.code].id,
        date: today,
        checkIn: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: ep.code === 'EMP-010' ? AttendanceStatus.WORK_FROM_HOME : AttendanceStatus.PRESENT,
        workingHours: 8,
      },
    });
  }

  // Monthly Payroll Run for Previous Month
  const payrollPrevMonth = await prisma.payrollRun.upsert({
    where: { organizationId_month_year: { organizationId: org.id, month: 9, year: 2026 } },
    update: {},
    create: {
      organizationId: org.id,
      month: 9,
      year: 2026,
      status: PayrollStatus.APPROVED,
      totalGrossSalary: 2080000,
      totalAllowances: 332000,
      totalDeductions: 260500,
      totalNetSalary: 2151500,
      employeeCount: 10,
      approvedById: users['ceo@apex.com'].id,
      approvedAt: new Date(2026, 9, 2),
      disbursedAt: new Date(2026, 9, 3),
    },
  });

  for (const ep of empProfiles) {
    const net = ep.base + ep.allow - ep.ded;
    await prisma.payslip.upsert({
      where: {
        payrollRunId_employeeId: {
          payrollRunId: payrollPrevMonth.id,
          employeeId: employees[ep.code].id,
        },
      },
      update: {},
      create: {
        payrollRunId: payrollPrevMonth.id,
        employeeId: employees[ep.code].id,
        baseSalary: ep.base,
        allowances: ep.allow,
        deductions: ep.ded,
        netSalary: net,
        attendanceDays: 28,
        leaveDays: 2,
        status: PayrollStatus.APPROVED,
        paymentDate: new Date(2026, 9, 3),
      },
    });
  }

  // 15. Projects & Tasks
  const proj1 = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PRJ-2026-GRID' } },
    update: {},
    create: {
      organizationId: org.id,
      customerId: customers['CUST-001'].id,
      code: 'PRJ-2026-GRID',
      name: 'Smart Grid & Renewable Microstation Phase 2',
      description: 'Design and deployment of hybrid 5kVA solar inverters and IoT monitoring gateways',
      status: ProjectStatus.ACTIVE,
      priority: PriorityLevel.HIGH,
      startDate: new Date(2026, 5, 1),
      endDate: new Date(2026, 11, 30),
      budget: 4500000,
      spentCost: 1850000,
      billingType: BillingType.FIXED_PRICE,
      managerId: users['projects@apex.com'].id,
    },
  });

  const task1 = await prisma.task.create({
    data: {
      projectId: proj1.id,
      title: 'Deploy Telematics Firmware v2.1 on 50 Edge Gateways',
      description: 'Ensure MQTT TLS handshake with Azure IoT Central',
      assignedToId: users['projects@apex.com'].id,
      priority: PriorityLevel.HIGH,
      status: TaskStatus.IN_PROGRESS,
      estimatedHours: 40,
      actualHours: 24,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  });

  // 16. Support Tickets
  await prisma.supportTicket.upsert({
    where: { organizationId_ticketNumber: { organizationId: org.id, ticketNumber: 'TCK-2026-1049' } },
    update: {},
    create: {
      organizationId: org.id,
      customerId: customers['CUST-002'].id,
      ticketNumber: 'TCK-2026-1049',
      subject: 'Inverter telemetry telemetry packet loss on Remote Substation 4',
      description: 'Customer reports 15% packet drop over cellular 4G backhaul.',
      priority: PriorityLevel.HIGH,
      status: TicketStatus.IN_PROGRESS,
      category: TicketCategory.TECHNICAL,
      assignedToId: users['projects@apex.com'].id,
      messages: {
        create: [
          { senderType: 'CUSTOMER', message: 'Noticing irregular heartbeat telemetry packets since yesterday.' },
          { senderType: 'USER', senderId: users['projects@apex.com'].id, message: 'Investigating cellular MTU buffer settings on Edge Gateway.' },
        ],
      },
    },
  });

  // 17. Pending Approval Requests & Notifications
  await prisma.approvalRequest.createMany({
    data: [
      {
        organizationId: org.id,
        requestedById: users['procurement@apex.com'].id,
        approverId: users['ceo@apex.com'].id,
        module: 'PROCUREMENT',
        entityType: 'PURCHASE_ORDER',
        entityId: po1.id,
        title: 'Approve PO-2026-0182 for 200 units LiFePO4 Battery Cells',
        description: 'Critical replenishment for manufacturing line 2. Total: ₹3,18,600',
        amount: 318600,
        status: ApprovalStatus.PENDING,
      },
      {
        organizationId: org.id,
        requestedById: users['hr@apex.com'].id,
        approverId: users['finance@apex.com'].id,
        module: 'HRMS',
        entityType: 'PAYROLL_RUN',
        entityId: payrollPrevMonth.id,
        title: 'October 2026 Advance Bonus Disbursement',
        description: 'Festive Diwali advance payment request for plant engineers',
        amount: 450000,
        status: ApprovalStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });

  // 18. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: org.id,
        userId: users['sales@apex.com'].id,
        entity: 'SalesOrder',
        entityId: so1.id,
        action: 'CONFIRM_SALES_ORDER',
        newData: { orderNumber: so1.orderNumber, total: so1.totalAmount, reservedStock: 10 },
      },
      {
        organizationId: org.id,
        userId: users['production@apex.com'].id,
        entity: 'WorkOrder',
        entityId: wo1.id,
        action: 'RELEASE_WORK_ORDER',
        newData: { workOrderNumber: wo1.workOrderNumber, targetQuantity: 20 },
      },
    ],
  });

  console.log('🎉 Database seeding completed successfully with 100% interconnected enterprise records!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
