// Helper function to build pagination query parameters
exports.getPaginationParams = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    return {
        skip,
        take: limit,
        page,
        limit
    };
};

// Helper function to build pagination response
exports.buildPaginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};

// Helper for sorting
exports.getSortParams = (req, defaultSort = { createdAt: 'desc' }) => {
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (!sortBy) return defaultSort;

    return { [sortBy]: sortOrder };
};
