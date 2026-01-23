import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed, or use standard fonts
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf' }, // Simplified font loading for demo
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/1.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        padding: 40,
        lineHeight: 1.5,
        flexDirection: 'column',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#112244', // Dark Blue
        paddingBottom: 20,
    },
    logoContainer: {
        flexDirection: 'column',
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#112244',
    },
    logoSubtext: {
        fontSize: 10,
        color: '#666666',
    },
    invoiceDetails: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    invoiceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#112244',
        textTransform: 'uppercase',
    },
    invoiceInfo: {
        marginTop: 10,
        fontSize: 10,
        color: '#333333',
        alignItems: 'flex-end',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    billToContainer: {
        marginTop: 20,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    billTo: {
        width: '45%',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#112244',
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    addressText: {
        fontSize: 10,
        color: '#333333',
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    tableHeaderCell: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    tableCell: {
        fontSize: 9,
        color: '#1f2937',
    },
    descriptionCell: {
        width: '40%',
    },
    qtyCell: {
        width: '15%',
        textAlign: 'center',
    },
    priceCell: {
        width: '20%',
        textAlign: 'right',
    },
    totalCell: {
        width: '25%',
        textAlign: 'right',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    summaryBlock: {
        width: '40%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#374151',
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#112244',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        marginTop: 5,
        borderTopWidth: 2,
        borderTopColor: '#112244',
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#112244',
        textTransform: 'uppercase',
    },
    grandTotalValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#112244',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 20,
    },
    notesTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#112244',
        marginBottom: 3,
    },
    notesText: {
        fontSize: 9,
        color: '#6b7280',
        marginBottom: 10,
    },
    thankYouMessage: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#112244',
        textAlign: 'center',
        marginTop: 10,
    },
});

interface InvoicePDFProps {
    invoice: any; // Type strictly if shared types available
}

const InvoicePDF = ({ invoice }: InvoicePDFProps) => {
    const subtotal = invoice.items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100);
    const totalAmount = subtotal + taxAmount;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>Scientific Solutions</Text>
                        <Text style={styles.logoSubtext}>Advanced Engineering & ERP</Text>
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <View style={styles.invoiceInfo}>
                            <Text>Invoice #: {invoice.invoiceNumber}</Text>
                            <Text>Date: {new Date(invoice.date).toLocaleDateString()}</Text>
                            <Text>Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</Text>
                            <Text>Status: {invoice.status}</Text>
                        </View>
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.billToContainer}>
                    <View style={styles.billTo}>
                        <Text style={styles.sectionTitle}>Bill To:</Text>
                        <Text style={styles.addressText}>{invoice.company?.name}</Text>
                        <Text style={styles.addressText}>{invoice.company?.email}</Text>
                        {/* Add more company address fields if available in data */}
                    </View>
                    <View style={styles.billTo}>
                        <Text style={styles.sectionTitle}>Pay To:</Text>
                        <Text style={styles.addressText}>Scientific Solutions</Text>
                        <Text style={styles.addressText}>123 Tech Park, Suite 4B</Text>
                        <Text style={styles.addressText}>Innovation City, 560100</Text>
                        <Text style={styles.addressText}>payment@scientificsolutions.com</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.descriptionCell]}>Item / Description</Text>
                        <Text style={[styles.tableHeaderCell, styles.qtyCell]}>Qty</Text>
                        <Text style={[styles.tableHeaderCell, styles.priceCell]}>Price</Text>
                        <Text style={[styles.tableHeaderCell, styles.totalCell]}>Total</Text>
                    </View>

                    {invoice.items.map((item: any, index: number) => (
                        <View key={index} style={styles.tableRow}>
                            <View style={styles.descriptionCell}>
                                <Text style={{ fontWeight: 'bold' }}>{item.productName || 'Custom Item'}</Text>
                                {item.description ? <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>{item.description}</Text> : null}
                            </View>
                            <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, styles.priceCell]}>₹{Number(item.unitPrice).toFixed(2)}</Text>
                            <Text style={[styles.tableCell, styles.totalCell]}>₹{Number(item.totalPrice).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBlock}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Tax ({invoice.taxRate}%)</Text>
                            <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                            <Text style={styles.grandTotalValue}>₹{totalAmount.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer / Notes */}
                <View style={styles.footer}>
                    {invoice.notes && (
                        <View>
                            <Text style={styles.notesTitle}>Notes / Payment Terms:</Text>
                            <Text style={styles.notesText}>{invoice.notes}</Text>
                        </View>
                    )}
                    <Text style={styles.thankYouMessage}>Thank you for your business!</Text>
                </View>
            </Page>
        </Document>
    );
};

export default InvoicePDF;
