const Joi = require('joi');

// User validation schemas
exports.createUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(100).optional(),
    role: Joi.string().valid('ADMIN', 'SUB_ADMIN').optional(),
    permissionIds: Joi.array().items(Joi.number()).optional(),
    isActive: Joi.boolean().optional()
});

exports.updateUserSchema = Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().min(2).max(100).optional(),
    role: Joi.string().valid('ADMIN', 'SUB_ADMIN').optional(),
    permissionIds: Joi.array().items(Joi.number()).optional(),
    isActive: Joi.boolean().optional()
});

exports.loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Offer validation schemas
exports.createOfferSchema = Joi.object({
    companyId: Joi.number().required().messages({
        'any.required': 'Company is required'
    }),
    items: Joi.array().items(
        Joi.object({
            description: Joi.string().required(),
            quantity: Joi.number().positive().required(),
            unitPrice: Joi.number().positive().required(),
            total: Joi.number().positive().required()
        })
    ).min(1).required().messages({
        'array.min': 'At least one item is required'
    }),
    totalAmount: Joi.number().positive().required(),
    validUntil: Joi.date().optional(),
    notes: Joi.string().optional()
});

// Invoice validation schemas
exports.createInvoiceSchema = Joi.object({
    companyId: Joi.number().required(),
    items: Joi.array().items(
        Joi.object({
            description: Joi.string().required(),
            quantity: Joi.number().positive().required(),
            unitPrice: Joi.number().positive().required(),
            total: Joi.number().positive().required()
        })
    ).min(1).required(),
    totalAmount: Joi.number().positive().required(),
    dueDate: Joi.date().optional(),
    notes: Joi.string().optional()
});

// Project validation schema
exports.createProjectSchema = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Project name is required'
    }),
    description: Joi.string().optional(),
    budget: Joi.number().positive().optional(),
    status: Joi.string().valid('active', 'completed', 'onhold', 'planned').optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    clientId: Joi.number().optional(),
    cadFilePath: Joi.string().optional()
});

// Inventory validation schema
exports.createInventorySchema = Joi.object({
    name: Joi.string().required(),
    sku: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().positive().required(),
    quantity: Joi.number().integer().min(0).required(),
    minLevel: Joi.number().integer().min(0).optional(),
    maxLevel: Joi.number().integer().min(0).optional(),
    supplierId: Joi.number().optional()
});

exports.adjustStockSchema = Joi.object({
    type: Joi.string().valid('IN', 'OUT').required(),
    quantity: Joi.number().positive().required(),
    reason: Joi.string().optional()
});
