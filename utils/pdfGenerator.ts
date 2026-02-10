
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, LedgerEntry } from '../types';

interface PDFGeneratorProps {
    reportType: 'customer' | 'daily';
    customers: Customer[];
    entries: LedgerEntry[];
    startDate?: string;
    endDate?: string;
    selectedCustomer?: Customer;
    reportDate?: string;
    grandTotals?: { opening: number, debit: number, credit: number, closing: number };
}

export const generatePDF = ({
    reportType,
    customers,
    entries,
    startDate,
    endDate,
    selectedCustomer,
    reportDate,
    grandTotals: providedGrandTotals
}: PDFGeneratorProps) => {
    const doc = new jsPDF();

    // --- Constants ---
    const COMPANY_NAME = "RADHA KRISHNA FISH CENTRE";
    const COMPANY_TAGLINE = "(Fish Marchent & Commission Agent)";
    const PROPRIETOR = "Proprietor: Samar Bag";
    const ADDRESS = "Dholgora(Kalisa), Irhpala, Ghatal, Paschim Medinipur"
    const PHONE = "Mobile: 9800644582 // 8670367372 // 9679930081";

    // --- Helper Functions ---
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const drawHeader = (data: any) => {
        const pageWidth = doc.internal.pageSize.width;

        // 1. Company Name (Centered, Large, Bold)
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(COMPANY_NAME, pageWidth / 2, 15, { align: "center" });

        // 2. Proprietor & Address (Centered, Medium)
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(COMPANY_TAGLINE, pageWidth / 2, 20, { align: "center" });
        doc.text(PROPRIETOR, pageWidth / 2, 25, { align: "center" });
        doc.text(ADDRESS, pageWidth / 2, 30, { align: "center" });
        doc.text(PHONE, pageWidth / 2, 35, { align: "center" });

        // 3. Divider Line
        doc.setLineWidth(0.5);
        doc.line(10, 36, pageWidth - 10, 36);

        // 4. Report Meta Data (Left & Right)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");

        let title = "";
        let subTitle = "";

        if (reportType === 'daily') {
            title = "DAILY LEDGER SUMMARY";
            subTitle = `Date: ${formatDate(reportDate || '')}`;
        } else if (reportType === 'customer' && selectedCustomer) {
            title = "ACCOUNT STATEMENT";
            subTitle = `Customer: ${selectedCustomer.name}`;
        }

        doc.text(title, 14, 43);
        doc.setFont("helvetica", "normal");
        doc.text(subTitle, 14, 48);

        if (reportType === 'customer' && startDate && endDate) {
            doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 53);
        }

        // Generated Date (Right Aligned)
        const genDate = `Generated: ${new Date().toLocaleString()}`;
        doc.setFontSize(8);
        doc.text(genDate, pageWidth - 14, 43, { align: "right" });
    };

    // --- Table Generation ---
    let tableColumn: string[] = [];
    let tableRows: any[] = [];
    // Use provided grand totals if available, otherwise initialize to zero (and calculate below if needed, though efficiently we should aim to pass it)
    // Actually, if we pass grandTotals, we don't need to accumulate. But we still need to iterate to generate rows.
    // If grandTotals IS provided, we will NOT accumulate.
    let calculatedTotal = { opening: 0, debit: 0, credit: 0, closing: 0 };
    const useProvidedTotals = !!providedGrandTotals;

    if (reportType === 'daily') {
        tableColumn = ["Sr.", "Customer Name", "Opening", "Debit (-)", "Total", "Credit (+)", "Closing"];

        // Sort by Customer Order
        const sortedEntries = [...entries].sort((a, b) => {
            const custA = customers.find(c => c.id === a.customerId);
            const custB = customers.find(c => c.id === b.customerId);
            return (custA?.orderIndex || 0) - (custB?.orderIndex || 0);
        });

        sortedEntries.forEach((entry, index) => {
            const customerName = customers.find(c => c.id === entry.customerId)?.name || 'Unknown';
            const total = entry.openingBalance - entry.debit;

            tableRows.push([
                index + 1,
                customerName,
                entry.openingBalance.toLocaleString(),
                entry.debit > 0 ? entry.debit.toLocaleString() : '-',
                total.toLocaleString(),
                entry.credit > 0 ? entry.credit.toLocaleString() : '-',
                entry.closingBalance.toLocaleString()
            ]);

            // Accumulate Totals only if not provided
            if (!useProvidedTotals) {
                calculatedTotal.opening += entry.openingBalance;
                calculatedTotal.debit += entry.debit;
                calculatedTotal.credit += entry.credit;
                calculatedTotal.closing += entry.closingBalance;
            }
        });

    } else if (reportType === 'customer') {
        tableColumn = ["Sr.", "Date", "Opening", "Debit (-)", "Total", "Credit (+)", "Closing"];

        entries.forEach((entry, index) => {
            const total = entry.openingBalance - entry.debit;
            tableRows.push([
                index + 1,
                formatDate(entry.date),
                entry.openingBalance.toLocaleString(),
                entry.debit > 0 ? entry.debit.toLocaleString() : '-',
                total.toLocaleString(),
                entry.credit > 0 ? entry.credit.toLocaleString() : '-',
                entry.closingBalance.toLocaleString()
            ]);
            // Accumulate Totals only if not provided
            if (!useProvidedTotals) {
                calculatedTotal.opening += entry.openingBalance;
                calculatedTotal.debit += entry.debit;
                calculatedTotal.credit += entry.credit;
                calculatedTotal.closing += entry.closingBalance;
            }
        });
    }

    const finalGrandTotal = providedGrandTotals || calculatedTotal;

    // --- AutoTable ---
    autoTable(doc, {
        startY: 58,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        margin: { top: 60 },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [240, 240, 240], // Light Gray Header
            textColor: [40, 40, 40],    // Dark Gray Text
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 }, // Sr.
            1: { halign: 'left', fontStyle: 'bold' }, // Name / Date
            2: { halign: 'right' }, // Opening
            3: { halign: 'right', textColor: [220, 38, 38] }, // Debit (Red)
            4: { halign: 'right', textColor: [100, 116, 139] }, // Total (Slate)
            5: { halign: 'right', textColor: [5, 150, 105] }, // Credit (Green)
            6: { halign: 'right', fontStyle: 'bold' }, // Closing
        },
        didDrawPage: (data) => {
            // Draw Header on Every New Page
            drawHeader(data);

            // Footer: Page Number
            const str = 'Page ' + (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            const pageWidth = doc.internal.pageSize.width;
            doc.text(str, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });

    // --- Grand Totals Row (After Table) ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Ensure we don't run off the page
    if (finalY > doc.internal.pageSize.height - 40) {
        doc.addPage();
        drawHeader(null); // Redraw header on new page
        // Reset Y for the new page
        // We can just use a fixed start position for totals on new page
    }

    const totalsY = finalY > doc.internal.pageSize.height - 40 ? 60 : finalY;


    doc.setDrawColor(0);
    doc.setFillColor(245, 247, 250); // Very light grey
    doc.roundedRect(14, totalsY, 180, 25, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTALS", 20, totalsY + 15);

    const startX = 60;
    const gap = 35;

    // Opening
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Total Opening", startX, totalsY + 8);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(finalGrandTotal.opening.toLocaleString(), startX, totalsY + 16);

    // Debit
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text("Total Debit", startX + gap, totalsY + 8);
    doc.setFontSize(10);
    doc.text(finalGrandTotal.debit.toLocaleString(), startX + gap, totalsY + 16);

    // Credit
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text("Total Credit", startX + (gap * 2), totalsY + 8);
    doc.setFontSize(10);
    doc.text(finalGrandTotal.credit.toLocaleString(), startX + (gap * 2), totalsY + 16);

    // Closing
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 150);
    doc.text("Total Closing", startX + (gap * 3), totalsY + 8);
    doc.setFontSize(10);
    doc.text(finalGrandTotal.closing.toLocaleString(), startX + (gap * 3), totalsY + 16);


    // --- Save File ---
    const fileName = reportType === 'daily'
        ? `Daily_Ledger_${reportDate}.pdf`
        : `Statement_${selectedCustomer?.name}_${startDate && endDate ? startDate + "_" + endDate : new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(fileName);
};
