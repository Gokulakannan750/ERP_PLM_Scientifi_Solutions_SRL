const prisma = require('../prismaClient');

// @desc    Get general settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
    try {
        let settings = await prisma.settings.findFirst({
            where: { isDefault: true }
        });

        // If no settings exist yet, create default
        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    isDefault: true,
                    emailTemplates: JSON.stringify({
                        invoice: {
                            subject: 'Invoice from {{companyName}}',
                            body: 'Dear {{customerName}},\n\nPlease find attached the invoice {{invoiceNumber}}.\n\nThank you for your business.'
                        },
                        offer: {
                            subject: 'Offer from {{companyName}}',
                            body: 'Dear {{customerName}},\n\nHere is an offer {{offerNumber}} tailored for you.\n\nBest regards.'
                        },
                        po: {
                            subject: 'Purchase Order from {{companyName}}',
                            body: 'Dear {{supplierName}},\n\nPlease accept this purchase order {{poNumber}}.\n\nRegards.'
                        }
                    }),
                    invoiceTemplates: JSON.stringify([]),
                    companyName: '',
                    companyAddress: '',
                    companyPhone: '',
                    companyEmail: ''
                }
            });
        }

        // Helper to safe parse JSON
        const safeParse = (str, fallback = {}) => {
            if (typeof str === 'string') {
                try { return JSON.parse(str); } catch (e) { return fallback; }
            }
            return str || fallback;
        };

        const response = {
            ...settings,
            emailTemplates: safeParse(settings.emailTemplates, {}),
            invoiceTemplates: settings.invoiceTemplates ? JSON.parse(settings.invoiceTemplates) : [],
            offerTemplates: settings.offerTemplates ? JSON.parse(settings.offerTemplates) : [],
            companyName: settings.companyName || '',
            companyAddress: settings.companyAddress || '',
            companyPhone: settings.companyPhone || '',
            companyCountryCode: settings.companyCountryCode || '+91',
            companyEmail: settings.companyEmail || ''
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update general settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        const {
            dateFormat,
            timeFormat,
            emailTemplates,
            invoiceTemplates,
            offerTemplates,
            companyName,
            companyAddress,
            companyPhone,
            companyCountryCode,
            companyEmail
        } = req.body;

        // Prepare update data
        const updateData = {};
        if (dateFormat) updateData.dateFormat = dateFormat;
        if (timeFormat) updateData.timeFormat = timeFormat;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (companyAddress !== undefined) updateData.companyAddress = companyAddress;
        if (companyPhone !== undefined) updateData.companyPhone = companyPhone;
        if (companyCountryCode !== undefined) updateData.companyCountryCode = companyCountryCode;
        if (companyEmail !== undefined) updateData.companyEmail = companyEmail;

        if (invoiceTemplates) {
            updateData.invoiceTemplates = JSON.stringify(invoiceTemplates);
        }
        if (offerTemplates) {
            updateData.offerTemplates = JSON.stringify(offerTemplates);
        }

        // Handle email templates merging
        if (emailTemplates) {
            const currentSettings = await prisma.settings.findFirst({ where: { isDefault: true } });
            let currentTemplates = {};
            if (currentSettings && currentSettings.emailTemplates) {
                try {
                    currentTemplates = typeof currentSettings.emailTemplates === 'string'
                        ? JSON.parse(currentSettings.emailTemplates)
                        : currentSettings.emailTemplates;
                } catch (e) { }
            }

            const newTemplates = {
                ...currentTemplates,
                ...emailTemplates,
                invoice: { ...currentTemplates.invoice, ...emailTemplates.invoice },
                offer: { ...currentTemplates.offer, ...emailTemplates.offer },
                po: { ...currentTemplates.po, ...emailTemplates.po }
            };

            updateData.emailTemplates = JSON.stringify(newTemplates);
        }

        const updatedSettings = await prisma.settings.upsert({
            where: { isDefault: true },
            update: updateData,
            create: {
                isDefault: true,
                dateFormat: dateFormat || 'DD/MM/YYYY',
                timeFormat: timeFormat || 'HH:mm',
                emailTemplates: JSON.stringify(emailTemplates || {}),
                invoiceTemplates: JSON.stringify(invoiceTemplates || []),
                offerTemplates: JSON.stringify(offerTemplates || []),
                companyName: companyName || '',
                companyAddress: companyAddress || '',
                companyPhone: companyPhone || '',
                companyCountryCode: companyCountryCode || '+91',
                companyEmail: companyEmail || ''
            }
        });

        // Response parsing
        const safeParse = (str, fallback = {}) => {
            if (typeof str === 'string') {
                try { return JSON.parse(str); } catch (e) { return fallback; }
            }
            return str || fallback;
        };

        res.json({
            ...updatedSettings,
            emailTemplates: safeParse(updatedSettings.emailTemplates, {}),
            invoiceTemplates: safeParse(updatedSettings.invoiceTemplates, [])
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
