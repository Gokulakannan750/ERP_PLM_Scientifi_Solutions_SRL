import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { fontSize: 10, padding: 40, lineHeight: 1.5, flexDirection: 'column', backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#112244', paddingBottom: 20 },
    logoText: { fontSize: 20, fontWeight: 'bold', color: '#112244' },
    logoSubtext: { fontSize: 10, color: '#666666' },
    docTitle: { fontSize: 24, fontWeight: 'bold', color: '#112244', textTransform: 'uppercase' },
    docInfo: { marginTop: 10, fontSize: 10, color: '#333333', alignItems: 'flex-end' },
    billToContainer: { marginTop: 20, marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between' },
    billTo: { width: '45%' },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#112244', marginBottom: 5, textTransform: 'uppercase' },
    addressText: { fontSize: 10, color: '#333333' },
    table: { width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, marginBottom: 20 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 5 },
    tableHeaderCell: { fontSize: 9, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 5 },
    tableCell: { fontSize: 9, color: '#1f2937' },
    descCell: { width: '40%' },
    qtyCell: { width: '10%', textAlign: 'center' },
    priceCell: { width: '20%', textAlign: 'right' },
    discCell: { width: '10%', textAlign: 'right' },
    totalCell: { width: '20%', textAlign: 'right' },
    summaryContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    summaryBlock: { width: '40%' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    summaryLabel: { fontSize: 10, color: '#374151' },
    summaryValue: { fontSize: 10, fontWeight: 'bold', color: '#112244' },
    grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 5, borderTopWidth: 2, borderTopColor: '#112244' },
    grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#112244', textTransform: 'uppercase' },
    grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#112244' },
    footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20 },
    notesTitle: { fontSize: 10, fontWeight: 'bold', color: '#112244', marginBottom: 3 },
    notesText: { fontSize: 9, color: '#6b7280', marginBottom: 10 },
    thankYouMessage: { fontSize: 12, fontWeight: 'bold', color: '#112244', textAlign: 'center', marginTop: 10 },
    validityBadge: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 4 },
    validityText: { fontSize: 9, color: '#166534' },
});

interface OfferPDFProps {
    offer: any;
}

const OfferPDF = ({ offer }: OfferPDFProps) => {
    const subtotal   = offer.items.reduce((s: number, i: any) => s + Number(i.totalPrice), 0);
    const taxAmount  = subtotal * (Number(offer.taxRate) / 100);
    const total      = subtotal + taxAmount;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logoText}>Scientific Solutions</Text>
                        <Text style={styles.logoSubtext}>Advanced Engineering &amp; ERP</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.docTitle}>QUOTATION</Text>
                        <View style={styles.docInfo}>
                            <Text>Quote #: {offer.offerNumber}</Text>
                            <Text>Version: v{offer.version || 1}</Text>
                            <Text>Date: {new Date(offer.createdAt).toLocaleDateString()}</Text>
                            {offer.validUntil && <Text>Valid Until: {new Date(offer.validUntil).toLocaleDateString()}</Text>}
                            <Text>Status: {offer.status}</Text>
                        </View>
                        {offer.validUntil && (
                            <View style={styles.validityBadge}>
                                <Text style={styles.validityText}>
                                    This quote is valid until {new Date(offer.validUntil).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.billToContainer}>
                    <View style={styles.billTo}>
                        <Text style={styles.sectionTitle}>Prepared For:</Text>
                        <Text style={styles.addressText}>{offer.company?.name}</Text>
                        <Text style={styles.addressText}>{offer.company?.email || ''}</Text>
                    </View>
                    <View style={styles.billTo}>
                        <Text style={styles.sectionTitle}>Prepared By:</Text>
                        <Text style={styles.addressText}>Scientific Solutions</Text>
                        <Text style={styles.addressText}>123 Tech Park, Suite 4B</Text>
                        <Text style={styles.addressText}>Innovation City, 560100</Text>
                        <Text style={styles.addressText}>quotes@scientificsolutions.com</Text>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.descCell]}>Item / Description</Text>
                        <Text style={[styles.tableHeaderCell, styles.qtyCell]}>Qty</Text>
                        <Text style={[styles.tableHeaderCell, styles.priceCell]}>Unit Price</Text>
                        <Text style={[styles.tableHeaderCell, styles.discCell]}>Disc%</Text>
                        <Text style={[styles.tableHeaderCell, styles.totalCell]}>Total</Text>
                    </View>

                    {offer.items.map((item: any, index: number) => (
                        <View key={index} style={styles.tableRow}>
                            <View style={styles.descCell}>
                                <Text style={{ fontWeight: 'bold' }}>{item.productName || 'Item'}</Text>
                                {item.description ? <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>{item.description}</Text> : null}
                            </View>
                            <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, styles.priceCell]}>₹{Number(item.unitPrice).toFixed(2)}</Text>
                            <Text style={[styles.tableCell, styles.discCell]}>{Number(item.discountPercent || 0).toFixed(1)}%</Text>
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
                            <Text style={styles.summaryLabel}>Tax ({offer.taxRate}%)</Text>
                            <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                            <Text style={styles.grandTotalValue}>₹{total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {offer.description && (
                        <View>
                            <Text style={styles.notesTitle}>Notes &amp; Terms:</Text>
                            <Text style={styles.notesText}>{offer.description}</Text>
                        </View>
                    )}
                    <Text style={styles.thankYouMessage}>Thank you for the opportunity to quote!</Text>
                </View>
            </Page>
        </Document>
    );
};

export default OfferPDF;
