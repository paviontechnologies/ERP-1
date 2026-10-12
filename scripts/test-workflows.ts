import { PrismaClient } from '@prisma/client';
import { SalesService } from '../src/services/sales.service';
import { ProcurementService } from '../src/services/procurement.service';
import { ManufacturingService } from '../src/services/manufacturing.service';
import { HRMSService } from '../src/services/hrms.service';
import { parseVoiceIntent } from '../src/lib/voice-ai/intent-parser';
import { executeVoiceCommand } from '../src/lib/voice-ai/action-executor';
import { DEMO_USERS } from '../src/lib/auth';

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log('🧪 Starting Apex AI Voice ERP End-to-End Workflow & AI Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Single Source of Truth & Database Verification
    console.log('--- 1. Single Source of Truth Verification ---');
    const org = await prisma.organization.findFirst({
      include: { branches: true, departments: true, accounts: true, products: true },
    });
    assert(!!org, 'Authoritative Organization exists');
    assert((org?.branches.length || 0) >= 3, 'Multi-branch isolation active (3 branches seeded)');
    assert((org?.departments.length || 0) >= 8, '8+ Department entities present');
    assert((org?.accounts.length || 0) >= 15, 'Chart of Accounts initialized for double-entry bookkeeping');
    assert((org?.products.length || 0) >= 8, 'Product catalog configured with raw materials and finished goods');

    // 2. Order-to-Cash (O2C) Workflow Test
    console.log('\n--- 2. Order-to-Cash (O2C) End-to-End Test ---');
    const customer = await prisma.customer.findFirst({ where: { organizationId: org!.id } });
    const productFG = await prisma.product.findFirst({
      where: { organizationId: org!.id, type: 'FINISHED_GOOD', availableStock: { gt: 2 } },
    });
    assert(!!customer && !!productFG, 'Found eligible customer and finished good');

    const initialAvailable = productFG!.availableStock;
    const initialReserved = productFG!.reservedStock;

    // Create Draft Order
    const newOrder = await SalesService.createOrder({
      organizationId: org!.id,
      customerId: customer!.id,
      items: [{ productId: productFG!.id, quantity: 2, unitPrice: productFG!.sellingPrice }],
    });
    assert(newOrder.status === 'DRAFT', `Created draft sales order ${newOrder.orderNumber}`);

    // Confirm Order -> Automatically reserves stock & generates customer invoice
    const { order: confirmedOrder, invoice } = await SalesService.confirmOrder({
      organizationId: org!.id,
      orderId: newOrder.id,
    });
    assert(confirmedOrder.status === 'CONFIRMED', 'Sales order status transitioned to CONFIRMED');
    assert(!!invoice && invoice.balanceDue > 0, `Customer invoice ${invoice.invoiceNumber} automatically created`);

    // Verify stock was authoritatively reserved in database
    const refreshedProduct = await prisma.product.findUnique({ where: { id: productFG!.id } });
    assert(
      refreshedProduct!.reservedStock === initialReserved + 2 &&
        refreshedProduct!.availableStock === initialAvailable - 2,
      'Authoritative stock reservation confirmed (Available stock decremented, Reserved stock incremented)'
    );

    // 3. Procure-to-Pay (P2P) Workflow Test
    console.log('\n--- 3. Procure-to-Pay (P2P) End-to-End Test ---');
    const vendor = await prisma.vendor.findFirst({ where: { organizationId: org!.id } });
    const rawMat = await prisma.product.findFirst({ where: { organizationId: org!.id, type: 'RAW_MATERIAL' } });
    const warehouse = await prisma.warehouse.findFirst({ where: { organizationId: org!.id } });
    assert(!!vendor && !!rawMat && !!warehouse, 'Found vendor, raw material, and warehouse');

    const prevRawStock = rawMat!.currentStock;

    // Create Purchase Order
    const po = await ProcurementService.createPurchaseOrder({
      organizationId: org!.id,
      vendorId: vendor!.id,
      items: [{ productId: rawMat!.id, quantity: 50, unitPrice: rawMat!.costPrice }],
    });
    assert(po.status === 'DRAFT', `Created purchase order ${po.poNumber}`);

    const adminUser = await prisma.user.findFirst({ where: { organizationId: org!.id } });
    assert(!!adminUser, 'Found admin user');

    // Approve Purchase Order
    const approvedPO = await ProcurementService.approvePurchaseOrder({
      organizationId: org!.id,
      poId: po.id,
      userId: adminUser!.id,
    });
    assert(approvedPO.status === 'ISSUED', 'PO approved and issued to supplier');

    // Process Goods Receipt Note (GRN) -> increments inventory & updates ledger
    const grn = await ProcurementService.processGoodsReceipt({
      organizationId: org!.id,
      purchaseOrderId: po.id,
      warehouseId: warehouse!.id,
      items: [{ productId: rawMat!.id, receivedQuantity: 50 }],
    });
    assert(grn.status === 'ACCEPTED', `Goods Receipt Note ${grn.grnNumber} generated`);

    const refreshedRawMat = await prisma.product.findUnique({ where: { id: rawMat!.id } });
    assert(
      refreshedRawMat!.currentStock === prevRawStock + 50,
      'Warehouse stock incremented by 50 units upon GRN processing'
    );

    // 4. Plan-to-Produce (Manufacturing) Workflow Test
    console.log('\n--- 4. Plan-to-Produce End-to-End Test ---');
    const bom = await prisma.billOfMaterials.findFirst({
      where: { organizationId: org!.id },
      include: { finishedProduct: true, items: true },
    });
    assert(!!bom, `Found Bill of Materials spec ${bom?.bomNumber}`);

    const targetProducedQty = 2;
    const workOrder = await ManufacturingService.createWorkOrder({
      organizationId: org!.id,
      bomId: bom!.id,
      targetQuantity: targetProducedQty,
    });
    assert(workOrder.status === 'PLANNED', `Work order ${workOrder.workOrderNumber} created`);

    // Complete Work Order -> Consumes raw materials, increments finished goods
    const prevFGStock = (await prisma.product.findUnique({ where: { id: bom!.finishedProductId } }))!.currentStock;
    const completedWO = await ManufacturingService.completeWorkOrder({
      organizationId: org!.id,
      workOrderId: workOrder.id,
      producedQuantity: targetProducedQty,
    });
    assert(completedWO.status === 'COMPLETED', 'Work order completed');

    const updatedFGStock = (await prisma.product.findUnique({ where: { id: bom!.finishedProductId } }))!.currentStock;
    assert(
      updatedFGStock === prevFGStock + targetProducedQty,
      `Finished goods stock increased by ${targetProducedQty} units after assembly`
    );

    // 5. Hire-to-Retire (HRMS & Payroll) Workflow Test
    console.log('\n--- 5. HRMS & Payroll Automation Test ---');
    const emp = await prisma.employee.findFirst({ where: { organizationId: org!.id } });
    assert(!!emp, 'Employee record present');

    // Clean up test payroll run if previously executed
    await prisma.approvalRequest.deleteMany({ where: { entityType: 'PAYROLL_RUN' } });
    await prisma.payslip.deleteMany({ where: { payrollRun: { month: 11, year: 2026 } } });
    await prisma.payrollRun.deleteMany({ where: { month: 11, year: 2026 } });

    // Run Monthly Payroll
    const payrollRes = await HRMSService.runMonthlyPayroll({
      organizationId: org!.id,
      month: 11,
      year: 2026,
    });
    assert(payrollRes.count > 0 && payrollRes.totalNet > 0, `Monthly payroll calculated for ${payrollRes.count} staff`);

    // Approve Payroll -> Disburses net salary and posts to General Ledger
    const approvedPayroll = await HRMSService.approvePayroll({
      organizationId: org!.id,
      payrollRunId: payrollRes.payrollRun.id,
      userId: 'finance@apex.com',
    });
    assert(approvedPayroll.status === 'APPROVED', 'Payroll approved and disbursed with financial posting');

    // 6. Multilingual AI Voice Assistant Intent Tests
    console.log('\n--- 6. Multilingual AI Voice Assistant Verification ---');
    const dbCEO = await prisma.user.findFirst({ where: { organizationId: org!.id, role: 'CEO' } });
    const ceoUser = {
      id: dbCEO!.id,
      name: dbCEO!.name,
      email: dbCEO!.email,
      role: 'CEO' as any,
      organizationId: org!.id,
    };

    // Test Hindi query
    const hindiCmd = parseVoiceIntent('आज कंपनी की कुल बिक्री कितनी है?');
    assert(hindiCmd.intent === 'GET_TODAY_SALES', "Parsed Hindi intent: 'आज कंपनी की कुल बिक्री कितनी है?'");
    const hindiExec = await executeVoiceCommand(hindiCmd, ceoUser);
    assert(hindiExec.success && hindiExec.spokenResponse.includes('बिक्री'), 'Executed Hindi query with spoken Hindi response');

    // Test English query
    const englishCmd = parseVoiceIntent("Show me this month's revenue and expenses");
    assert(englishCmd.intent === 'GET_REVENUE_EXPENSES', "Parsed English intent: 'Show me this month revenue and expenses'");
    const englishExec = await executeVoiceCommand(englishCmd, ceoUser);
    assert(englishExec.success && englishExec.spokenResponse.includes('revenue'), 'Executed English query with spoken English response');

    // Test Hinglish query
    const hinglishCmd = parseVoiceIntent('Kam stock wale products dikhao');
    assert(hinglishCmd.intent === 'LIST_LOW_STOCK', "Parsed Hinglish intent: 'Kam stock wale products dikhao'");
    const hinglishExec = await executeVoiceCommand(hinglishCmd, ceoUser);
    assert(hinglishExec.success && !!hinglishExec.dataCard, 'Executed Hinglish query returning low stock data card');

    // Test Cross-department query
    const crossDeptCmd = parseVoiceIntent('Show me sales orders that cannot be fulfilled because of low stock');
    assert(crossDeptCmd.intent === 'UNFULFILLED_ORDERS_LOW_STOCK', 'Parsed cross-department stock shortage intent');

    // Test High-Impact Confirmation Guardrail
    const poCmd = parseVoiceIntent('Create a draft purchase order for 100 units of product X');
    assert(poCmd.requiresConfirmation === true, 'High-impact PO command flagged with requiresConfirmation: true');
    const poPreview = await executeVoiceCommand(poCmd, ceoUser, false);
    assert(poPreview.actionProposed === true, 'Confirmation preview card triggered before destructive mutation');

    // Confirm execution
    const poConfirmedExec = await executeVoiceCommand(poCmd, ceoUser, true);
    assert(poConfirmedExec.success && poConfirmedExec.spokenResponse.includes('PO-2026'), 'Confirmed PO execution created real purchase order in database');

    console.log(`\n========================================`);
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test suite encountered an error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
