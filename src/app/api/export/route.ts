import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity') || 'products';

    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

    let csvContent = '';
    let filename = `${entity}-export.csv`;

    if (entity === 'products') {
      const products = await prisma.product.findMany({
        where: { organizationId: org.id },
        include: { category: true },
        orderBy: { sku: 'asc' },
      });
      const headers = ['SKU', 'Name', 'Category', 'Type', 'Cost Price', 'Selling Price', 'Current Stock', 'Reserved', 'Available', 'Reorder Point'];
      const rows = products.map((p) => [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category?.name || 'General',
        p.type,
        p.costPrice,
        p.sellingPrice,
        p.currentStock,
        p.reservedStock,
        p.availableStock,
        p.reorderPoint,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'sales') {
      const orders = await prisma.salesOrder.findMany({
        where: { organizationId: org.id },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      const headers = ['Order Number', 'Customer', 'Date', 'Status', 'Payment Status', 'Subtotal', 'Tax', 'Total Amount'];
      const rows = orders.map((o) => [
        o.orderNumber,
        `"${o.customer.name.replace(/"/g, '""')}"`,
        o.createdAt.toISOString().split('T')[0],
        o.status,
        o.paymentStatus,
        o.subtotal,
        o.taxAmount,
        o.totalAmount,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where: { organizationId: org.id },
        include: { customer: true },
        orderBy: { issueDate: 'desc' },
      });
      const headers = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Status', 'Total Amount', 'Paid Amount', 'Balance Due'];
      const rows = invoices.map((i) => [
        i.invoiceNumber,
        `"${i.customer.name.replace(/"/g, '""')}"`,
        i.issueDate.toISOString().split('T')[0],
        i.dueDate.toISOString().split('T')[0],
        i.status,
        i.totalAmount,
        i.paidAmount,
        i.balanceDue,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'procurement') {
      const pos = await prisma.purchaseOrder.findMany({
        where: { organizationId: org.id },
        include: { vendor: true },
        orderBy: { createdAt: 'desc' },
      });
      const headers = ['PO Number', 'Vendor', 'Status', 'Subtotal', 'Tax', 'Total Amount', 'Expected Delivery'];
      const rows = pos.map((p) => [
        p.poNumber,
        `"${p.vendor.name.replace(/"/g, '""')}"`,
        p.status,
        p.subtotal,
        p.taxAmount,
        p.totalAmount,
        p.expectedDeliveryDate ? p.expectedDeliveryDate.toISOString().split('T')[0] : 'N/A',
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'employees') {
      const employees = await prisma.employee.findMany({
        where: { organizationId: org.id },
        include: { department: true },
        orderBy: { employeeCode: 'asc' },
      });
      const headers = ['Employee Code', 'Name', 'Department', 'Designation', 'Status', 'Base Salary', 'Allowances', 'Net Monthly'];
      const rows = employees.map((e) => [
        e.employeeCode,
        `"${e.firstName} ${e.lastName}"`,
        e.department.name,
        e.designation,
        e.status,
        e.baseSalary,
        e.allowances,
        e.baseSalary + e.allowances - e.deductions,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
