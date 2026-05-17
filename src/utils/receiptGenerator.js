import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateReceipt = (transaction, items) => {
  try {
    const doc = new jsPDF();
    const pharmacyName = "PharmaVision AI Terminal";
    const dateStr = new Date(transaction.transaction_time || Date.now()).toLocaleString();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text("PharmaVision AI", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(pharmacyName, 105, 27, { align: 'center' });
    doc.text(`Transaction ID: #PV-${String(transaction.id || 'N/A').slice(0, 8).toUpperCase()}`, 105, 33, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Transaction Info
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`Sold By: ${transaction.sold_by_name || 'Pharmacist'}`, 20, 50);
    doc.text(`Date: ${dateStr}`, 140, 50);
    doc.text(`Status: Payment Confirmed`, 20, 57);

    // Table
    const tableRows = items.map(item => [
      item.medicine_name,
      item.qty || item.quantity_sold,
      `INR ${Number(item.unit_price).toFixed(2)}`,
      `INR ${(item.unit_price * (item.qty || item.quantity_sold)).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Medicine', 'Qty', 'Price', 'Subtotal']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Amount Paid:`, 110, finalY);
    doc.text(`INR ${Number(transaction.total_amount).toFixed(2)}`, 190, finalY, { align: 'right' });

    // Barcode Placeholder
    doc.setDrawColor(230);
    doc.rect(85, finalY + 15, 40, 15);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("SCAN FOR AUTHENTICITY", 105, finalY + 35, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Thank you for choosing PharmaVision AI - Your Digital Pharmacy Partner.", 105, 280, { align: 'center' });
    doc.text("This is an electronically generated receipt.", 105, 285, { align: 'center' });

    doc.save(`Receipt_${transaction.id || 'new'}.pdf`);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    throw new Error("Could not generate PDF receipt.");
  }
};
