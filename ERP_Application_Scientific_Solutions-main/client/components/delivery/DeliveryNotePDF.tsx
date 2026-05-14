import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
    page:      { fontSize: 9, fontFamily: 'Helvetica', padding: 40, color: '#1a1a2e' },
    header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
    logo:      { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
    subtitle:  { fontSize: 8, color: '#6b7280', marginTop: 2 },
    title:     { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1e3a5f', marginBottom: 4 },
    dnNum:     { fontSize: 10, color: '#6b7280' },
    badge:     { backgroundColor: '#dbeafe', color: '#1e40af', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontSize: 8, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start', marginTop: 6 },
    section:   { backgroundColor: '#f8fafc', borderRadius: 6, padding: 14, marginBottom: 14 },
    sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    row2:      { flexDirection: 'row', gap: 14 },
    col:       { flex: 1 },
    label:     { fontSize: 7, color: '#9ca3af', marginBottom: 2 },
    value:     { fontSize: 9, color: '#111827' },
    valueBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
    tableHead: { flexDirection: 'row', backgroundColor: '#1e3a5f', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, marginBottom: 2 },
    colDesc:   { flex: 4 },
    colQty:    { flex: 1, textAlign: 'center' },
    colUnit:   { flex: 1, textAlign: 'center' },
    colBatch:  { flex: 2 },
    thText:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff' },
    tableRow:  { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tdText:    { fontSize: 8.5, color: '#374151' },
    tdCenter:  { fontSize: 8.5, color: '#374151', textAlign: 'center' },
    tdSmall:   { fontSize: 7.5, color: '#6b7280' },
    footer:    { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    footerText:{ fontSize: 7, color: '#9ca3af' },
    signBox:   { width: 140, borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 4, alignItems: 'center' },
    signLabel: { fontSize: 7, color: '#9ca3af' },
});

export default function DeliveryNotePDF({ dn }: { dn: any }) {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

    return (
        <Document>
            <Page size="A4" style={s.page}>
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.logo}>Scientific Solutions</Text>
                        <Text style={s.subtitle}>Scientific ERP · Delivery Note</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.title}>DELIVERY NOTE</Text>
                        <Text style={s.dnNum}>{dn.deliveryNumber}</Text>
                        <View style={[s.badge, { backgroundColor: dn.status === 'DELIVERED' ? '#d1fae5' : dn.status === 'SHIPPED' ? '#fef3c7' : '#dbeafe' }]}>
                            <Text style={{ color: dn.status === 'DELIVERED' ? '#065f46' : dn.status === 'SHIPPED' ? '#92400e' : '#1e40af' }}>
                                {dn.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Client & References */}
                <View style={s.row2}>
                    <View style={[s.section, s.col]}>
                        <Text style={s.sectionTitle}>Deliver To</Text>
                        <Text style={s.valueBold}>{dn.company?.name || '—'}</Text>
                        {dn.deliveryAddress && <Text style={[s.value, { marginTop: 4, color: '#6b7280', fontSize: 8 }]}>{dn.deliveryAddress}</Text>}
                    </View>
                    <View style={[s.section, s.col]}>
                        <Text style={s.sectionTitle}>References</Text>
                        {dn.invoice && <>
                            <Text style={s.label}>Invoice</Text>
                            <Text style={s.value}>#{dn.invoice.invoiceNumber}</Text>
                        </>}
                        {dn.customerPoNumber && <>
                            <Text style={[s.label, { marginTop: 4 }]}>Customer PO</Text>
                            <Text style={s.value}>{dn.customerPoNumber}</Text>
                        </>}
                        {dn.deliveryDate && <>
                            <Text style={[s.label, { marginTop: 4 }]}>Delivery Date</Text>
                            <Text style={s.value}>{fmt(dn.deliveryDate)}</Text>
                        </>}
                    </View>
                </View>

                {/* Shipping */}
                {(dn.carrier || dn.trackingNumber || dn.incoterms || dn.packageType) && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Shipping Information</Text>
                        <View style={s.row2}>
                            {dn.carrier && <View style={s.col}>
                                <Text style={s.label}>Carrier</Text>
                                <Text style={s.value}>{dn.carrier}</Text>
                            </View>}
                            {dn.trackingNumber && <View style={s.col}>
                                <Text style={s.label}>Tracking Number</Text>
                                <Text style={[s.value, { fontFamily: 'Courier', fontSize: 8 }]}>{dn.trackingNumber}</Text>
                            </View>}
                            {dn.incoterms && <View style={s.col}>
                                <Text style={s.label}>Incoterms</Text>
                                <Text style={s.valueBold}>{dn.incoterms}</Text>
                            </View>}
                            {dn.packageType && <View style={s.col}>
                                <Text style={s.label}>Package</Text>
                                <Text style={s.value}>{dn.packageType.replace('_', ' ')}{dn.packageCount ? ` × ${dn.packageCount}` : ''}</Text>
                            </View>}
                            {dn.weightKg && <View style={s.col}>
                                <Text style={s.label}>Weight</Text>
                                <Text style={s.value}>{Number(dn.weightKg)} kg</Text>
                            </View>}
                            {(dn.dimensionL || dn.dimensionW || dn.dimensionH) && <View style={s.col}>
                                <Text style={s.label}>Dimensions (cm)</Text>
                                <Text style={s.value}>{[dn.dimensionL, dn.dimensionW, dn.dimensionH].map((d: any) => d ? Number(d) : 0).join(' × ')}</Text>
                            </View>}
                        </View>
                    </View>
                )}

                {/* Line Items */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Items Delivered</Text>
                    <View style={s.tableHead}>
                        <Text style={[s.thText, s.colDesc]}>Description</Text>
                        <Text style={[s.thText, s.colQty]}>Qty</Text>
                        <Text style={[s.thText, s.colUnit]}>Unit</Text>
                        <Text style={[s.thText, s.colBatch]}>Serial / Batch</Text>
                    </View>
                    {(dn.items || []).map((item: any, i: number) => (
                        <View key={i} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }]}>
                            <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
                            <Text style={[s.tdCenter, s.colQty]}>{Number(item.quantity)}</Text>
                            <Text style={[s.tdCenter, s.colUnit]}>{item.unitOfMeasure}</Text>
                            <View style={s.colBatch}>
                                {item.serialNumbers && <Text style={s.tdSmall}>S/N: {item.serialNumbers}</Text>}
                                {item.batchNumber && <Text style={s.tdSmall}>Batch: {item.batchNumber}</Text>}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Notes */}
                {dn.notes && (
                    <View style={[s.section, { marginTop: 0 }]}>
                        <Text style={s.sectionTitle}>Notes</Text>
                        <Text style={s.value}>{dn.notes}</Text>
                    </View>
                )}

                {/* Signatures */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
                    <View style={s.signBox}>
                        <Text style={s.signLabel}>Dispatched By</Text>
                        <Text style={[s.signLabel, { marginTop: 30 }]}>Signature & Date</Text>
                    </View>
                    <View style={s.signBox}>
                        <Text style={s.signLabel}>Received By</Text>
                        <Text style={[s.signLabel, { marginTop: 30 }]}>Signature & Date</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={s.footerText}>Scientific Solutions · {dn.deliveryNumber}</Text>
                    <Text style={s.footerText}>Generated {new Date().toLocaleDateString('en-IN')}</Text>
                </View>
            </Page>
        </Document>
    );
}
