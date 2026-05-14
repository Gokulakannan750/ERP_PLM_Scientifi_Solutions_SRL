const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scientific Solutions ERP API',
      version: '1.0.0',
      description: 'REST API for the Scientific Solutions ERP — covers Auth, Companies, Contacts, Inventory, PLM, Projects, Offers, Invoices, and Settings.',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', minLength: 6,    example: 'secret123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id:    { type: 'integer' },
                email: { type: 'string' },
                role:  { type: 'string', enum: ['ADMIN', 'SUB_ADMIN'] },
              },
            },
          },
        },
        PlmItem: {
          type: 'object',
          properties: {
            id:             { type: 'integer' },
            sku:            { type: 'string', example: 'P00001A' },
            name:           { type: 'string' },
            plmType:        { type: 'string', enum: ['P', 'A', 'C', 'D'] },
            lifecycleState: { type: 'string', enum: ['IN_WORK', 'UNDER_REVIEW', 'RELEASED', 'OBSOLETE'] },
            revision:       { type: 'string', example: 'A' },
            isLocked:       { type: 'boolean' },
            isObsolete:     { type: 'boolean' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            sku:         { type: 'string' },
            name:        { type: 'string' },
            description: { type: 'string' },
            price:       { type: 'number' },
            quantity:    { type: 'integer' },
            minLevel:    { type: 'integer' },
            maxLevel:    { type: 'integer' },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id:           { type: 'integer' },
            name:         { type: 'string' },
            email:        { type: 'string' },
            phone:        { type: 'string' },
            isObsolete:   { type: 'boolean' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id:            { type: 'integer' },
            invoiceNumber: { type: 'string' },
            totalAmount:   { type: 'number' },
            taxRate:       { type: 'number' },
            status:        { type: 'string', enum: ['UNPAID', 'PAID', 'OVERDUE'] },
          },
        },
        Offer: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            offerNumber: { type: 'string' },
            totalAmount: { type: 'number' },
            status:      { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id:     { type: 'integer' },
            name:   { type: 'string' },
            status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',      description: 'Authentication' },
      { name: 'Companies', description: 'Company master data' },
      { name: 'Contacts',  description: 'People at companies' },
      { name: 'Inventory', description: 'Stock & product management' },
      { name: 'PLM',       description: 'Product Lifecycle Management (Creo integration)' },
      { name: 'Projects',  description: 'Project management' },
      { name: 'Offers',    description: 'Quotation / offer management' },
      { name: 'Invoices',  description: 'Invoice management' },
      { name: 'Settings',  description: 'Application settings' },
      { name: 'Admin',     description: 'User & permission management (ADMIN only)' },
      { name: 'Dashboard', description: 'Dashboard statistics' },
    ],
    paths: {
      // ── Auth ────────────────────────────────────────────────────────────────
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in and obtain a JWT',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'JWT token', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            400: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    role:     { type: 'string', enum: ['ADMIN', 'SUB_ADMIN'] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created' },
            409: { description: 'Email already in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── Companies ───────────────────────────────────────────────────────────
      '/api/companies': {
        get:  { tags: ['Companies'], summary: 'List all companies', responses: { 200: { description: 'Array of companies' } } },
        post: { tags: ['Companies'], summary: 'Create a company',  responses: { 200: { description: 'Created company' } } },
      },
      '/api/companies/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:    { tags: ['Companies'], summary: 'Get a company by ID',  responses: { 200: { description: 'Company detail' }, 404: { description: 'Not found' } } },
        put:    { tags: ['Companies'], summary: 'Update a company',     responses: { 200: { description: 'Updated company' } } },
        delete: { tags: ['Companies'], summary: 'Delete (soft) a company', responses: { 200: { description: 'Success' } } },
      },

      // ── Inventory ───────────────────────────────────────────────────────────
      '/api/inventory': {
        get:  { tags: ['Inventory'], summary: 'List products', responses: { 200: { description: 'Array of products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } } },
        post: { tags: ['Inventory'], summary: 'Create a product', responses: { 200: { description: 'Created product' } } },
      },
      '/api/inventory/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:    { tags: ['Inventory'], summary: 'Get product by ID', responses: { 200: { description: 'Product' }, 404: { description: 'Not found' } } },
        put:    { tags: ['Inventory'], summary: 'Update product (creates new version)', responses: { 200: { description: 'New version' } } },
        delete: { tags: ['Inventory'], summary: 'Soft-delete product', responses: { 200: { description: 'Success' } } },
      },
      '/api/inventory/{id}/check-in': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        post: { tags: ['Inventory'], summary: 'Stock check-in (add stock)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' }, reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Updated product' } } },
      },
      '/api/inventory/{id}/check-out': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        post: { tags: ['Inventory'], summary: 'Stock check-out (remove stock)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' }, reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Updated product' }, 400: { description: 'Insufficient stock' } } },
      },

      // ── PLM ─────────────────────────────────────────────────────────────────
      '/api/plm/items': {
        get:  { tags: ['PLM'], summary: 'List PLM items', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'lifecycleState', in: 'query', schema: { type: 'string' } }, { name: 'plmType', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Paginated PLM items' } } },
        post: { tags: ['PLM'], summary: 'Create PLM item', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'plmType'], properties: { name: { type: 'string' }, plmType: { type: 'string', enum: ['P', 'A', 'C', 'D'] }, description: { type: 'string' }, parentId: { type: 'integer' } } } } } }, responses: { 201: { description: 'Created PLM item', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlmItem' } } } } } },
      },
      '/api/plm/items/{id}/checkout': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        post: { tags: ['PLM'], summary: 'Check out a PLM item for editing', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { note: { type: 'string' } } } } } }, responses: { 200: { description: 'Checked-out item' }, 409: { description: 'Already checked out' } } },
      },
      '/api/plm/items/{id}/checkin': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        post: { tags: ['PLM'], summary: 'Check in a PLM item', responses: { 200: { description: 'Checked-in item' } } },
      },
      '/api/plm/items/{id}/state': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        patch: { tags: ['PLM'], summary: 'Transition lifecycle state', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nextState'], properties: { nextState: { type: 'string', enum: ['IN_WORK', 'UNDER_REVIEW', 'RELEASED', 'OBSOLETE'] } } } } } }, responses: { 200: { description: 'Updated item' } } },
      },
      '/api/plm/items/{id}/revise': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        post: { tags: ['PLM'], summary: 'Create next revision of a released item', responses: { 201: { description: 'New revision' } } },
      },
      '/api/plm/items/{id}/bom': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:  { tags: ['PLM'], summary: 'Get flat BOM', responses: { 200: { description: 'BOM rows' } } },
        post: { tags: ['PLM'], summary: 'Replace BOM components', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['components'], properties: { components: { type: 'array', items: { type: 'object', properties: { childId: { type: 'integer' }, quantity: { type: 'number' } } } } } } } } }, responses: { 200: { description: 'Updated BOM' } } },
      },
      '/api/plm/items/{id}/bom/tree': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get: { tags: ['PLM'], summary: 'Get multi-level BOM tree', responses: { 200: { description: 'Nested BOM' } } },
      },
      '/api/plm/items/{id}/bom/export': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get: { tags: ['PLM'], summary: 'Export BOM as CSV', responses: { 200: { description: 'CSV download', content: { 'text/csv': {} } } } },
      },
      '/api/plm/items/{id}/audit': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get: { tags: ['PLM'], summary: 'Get audit log for a PLM item', responses: { 200: { description: 'Audit log entries' } } },
      },
      '/api/plm/items/{id}/files': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:  { tags: ['PLM'], summary: 'List attached files', responses: { 200: { description: 'File list' } } },
        post: { tags: ['PLM'], summary: 'Upload a file attachment (multipart/form-data)', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Uploaded file record' } } },
      },
      '/api/plm/materials': {
        get:  { tags: ['PLM'], summary: 'List materials', responses: { 200: { description: 'Material list' } } },
        post: { tags: ['PLM'], summary: 'Create material', responses: { 201: { description: 'Created material' } } },
      },
      '/api/plm/workspace': {
        get: { tags: ['PLM'], summary: "Get current user's checked-out items", responses: { 200: { description: 'List of items checked out by the caller' } } },
      },

      // ── Offers ──────────────────────────────────────────────────────────────
      '/api/offers': {
        get:  { tags: ['Offers'], summary: 'List offers', responses: { 200: { description: 'Offer list' } } },
        post: { tags: ['Offers'], summary: 'Create offer', responses: { 201: { description: 'Created offer' } } },
      },
      '/api/offers/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:    { tags: ['Offers'], summary: 'Get offer',    responses: { 200: { description: 'Offer detail' } } },
        put:    { tags: ['Offers'], summary: 'Update offer', responses: { 200: { description: 'Updated offer' } } },
        delete: { tags: ['Offers'], summary: 'Delete offer', responses: { 200: { description: 'Success' } } },
      },

      // ── Invoices ────────────────────────────────────────────────────────────
      '/api/invoices': {
        get:  { tags: ['Invoices'], summary: 'List invoices', responses: { 200: { description: 'Invoice list' } } },
        post: { tags: ['Invoices'], summary: 'Create invoice', responses: { 201: { description: 'Created invoice' } } },
      },
      '/api/invoices/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:    { tags: ['Invoices'], summary: 'Get invoice',    responses: { 200: { description: 'Invoice detail' } } },
        put:    { tags: ['Invoices'], summary: 'Update invoice', responses: { 200: { description: 'Updated invoice' } } },
        delete: { tags: ['Invoices'], summary: 'Delete invoice', responses: { 200: { description: 'Success' } } },
      },

      // ── Projects ────────────────────────────────────────────────────────────
      '/api/projects': {
        get:  { tags: ['Projects'], summary: 'List projects', responses: { 200: { description: 'Project list' } } },
        post: { tags: ['Projects'], summary: 'Create project', responses: { 201: { description: 'Created project' } } },
      },
      '/api/projects/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        get:    { tags: ['Projects'], summary: 'Get project',    responses: { 200: { description: 'Project detail' } } },
        put:    { tags: ['Projects'], summary: 'Update project', responses: { 200: { description: 'Updated project' } } },
        delete: { tags: ['Projects'], summary: 'Delete project', responses: { 200: { description: 'Success' } } },
      },

      // ── Dashboard ───────────────────────────────────────────────────────────
      '/api/dashboard/stats': {
        get: { tags: ['Dashboard'], summary: 'Get dashboard statistics', responses: { 200: { description: 'Stats object' } } },
      },
      '/api/dashboard/activity': {
        get: { tags: ['Dashboard'], summary: 'Get recent activity feed', responses: { 200: { description: 'Activity list' } } },
      },

      // ── Settings ────────────────────────────────────────────────────────────
      '/api/settings': {
        get: { tags: ['Settings'], summary: 'Get application settings', responses: { 200: { description: 'Settings object' } } },
        put: { tags: ['Settings'], summary: 'Update application settings', responses: { 200: { description: 'Updated settings' } } },
      },
    },
  },
  apis: [], // paths defined inline above
};

module.exports = swaggerJsdoc(options);
