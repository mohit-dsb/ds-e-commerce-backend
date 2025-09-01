// OpenAPI paths for Product endpoints

export const productPaths = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Get all products',
      description: 'Retrieve products with optional filtering, sorting, and pagination',
      operationId: 'getProducts',
      parameters: [
        {
          name: 'status',
          in: 'query',
          description: 'Filter by product status',
          required: false,
          schema: {
            type: 'string',
            enum: ['draft', 'active', 'inactive', 'discontinued']
          }
        },
        {
          name: 'categoryId',
          in: 'query',
          description: 'Filter by category ID',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        {
          name: 'minPrice',
          in: 'query',
          description: 'Minimum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'maxPrice',
          in: 'query',
          description: 'Maximum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'inStock',
          in: 'query',
          description: 'Filter by stock availability',
          required: false,
          schema: {
            type: 'boolean'
          }
        },
        {
          name: 'tags',
          in: 'query',
          description: 'Comma-separated list of tags',
          required: false,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Search term for name, description',
          required: false,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'sortBy',
          in: 'query',
          description: 'Sort by field',
          required: false,
          schema: {
            type: 'string',
            enum: ['name', 'price', 'createdAt', 'updatedAt', 'inventoryQuantity'],
            default: 'createdAt'
          }
        },
        {
          $ref: '#/components/parameters/SortOrderParam'
        },
        {
          $ref: '#/components/parameters/PageParam'
        },
        {
          $ref: '#/components/parameters/LimitParam'
        }
      ],
      responses: {
        '200': {
          description: 'Products retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  {
                    $ref: '#/components/schemas/PaginatedResponse'
                  },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Product'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    post: {
      tags: ['Products'],
      summary: 'Create a new product',
      description: 'Create a new product (Admin only)',
      operationId: 'createProduct',
      security: [
        {
          bearerAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateProductRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Product created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Product created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by ID',
      description: 'Retrieve a specific product by its ID',
      operationId: 'getProductById',
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Product ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        {
          name: 'includeInactive',
          in: 'query',
          description: 'Include inactive products (admin only)',
          required: false,
          schema: {
            type: 'boolean',
            default: false
          }
        }
      ],
      responses: {
        '200': {
          description: 'Product retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    patch: {
      tags: ['Products'],
      summary: 'Update a product',
      description: 'Update an existing product (Admin only)',
      operationId: 'updateProduct',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Product ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateProductRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Product updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Product updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete a product',
      description: 'Delete an existing product (Admin only)',
      operationId: 'deleteProduct',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Product ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Product deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Product deleted successfully'
                  }
                }
              }
            }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/search': {
    get: {
      tags: ['Products'],
      summary: 'Search products',
      description: 'Search products by term with filtering and pagination',
      operationId: 'searchProducts',
      parameters: [
        {
          name: 'q',
          in: 'query',
          description: 'Search term (required)',
          required: true,
          schema: {
            type: 'string',
            minLength: 1
          }
        },
        {
          name: 'status',
          in: 'query',
          description: 'Filter by product status',
          required: false,
          schema: {
            type: 'string',
            enum: ['draft', 'active', 'inactive', 'discontinued']
          }
        },
        {
          name: 'categoryId',
          in: 'query',
          description: 'Filter by category ID',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        {
          name: 'minPrice',
          in: 'query',
          description: 'Minimum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'maxPrice',
          in: 'query',
          description: 'Maximum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'inStock',
          in: 'query',
          description: 'Filter by stock availability',
          required: false,
          schema: {
            type: 'boolean'
          }
        },
        {
          name: 'tags',
          in: 'query',
          description: 'Comma-separated list of tags',
          required: false,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'sortBy',
          in: 'query',
          description: 'Sort by field',
          required: false,
          schema: {
            type: 'string',
            enum: ['name', 'price', 'createdAt', 'updatedAt', 'inventoryQuantity'],
            default: 'createdAt'
          }
        },
        {
          $ref: '#/components/parameters/SortOrderParam'
        },
        {
          $ref: '#/components/parameters/PageParam'
        },
        {
          $ref: '#/components/parameters/LimitParam'
        }
      ],
      responses: {
        '200': {
          description: 'Search results retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  {
                    $ref: '#/components/schemas/PaginatedResponse'
                  },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Product'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/slug/{slug}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by slug',
      description: 'Retrieve a specific product by its slug',
      operationId: 'getProductBySlug',
      parameters: [
        {
          name: 'slug',
          in: 'path',
          description: 'Product slug',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'includeInactive',
          in: 'query',
          description: 'Include inactive products (admin only)',
          required: false,
          schema: {
            type: 'boolean',
            default: false
          }
        }
      ],
      responses: {
        '200': {
          description: 'Product retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  data: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/category/{categoryId}': {
    get: {
      tags: ['Products'],
      summary: 'Get products by category',
      description: 'Retrieve products filtered by category with pagination',
      operationId: 'getProductsByCategory',
      parameters: [
        {
          name: 'categoryId',
          in: 'path',
          description: 'Category ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        {
          name: 'status',
          in: 'query',
          description: 'Filter by product status',
          required: false,
          schema: {
            type: 'string',
            enum: ['draft', 'active', 'inactive', 'discontinued']
          }
        },
        {
          name: 'minPrice',
          in: 'query',
          description: 'Minimum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'maxPrice',
          in: 'query',
          description: 'Maximum price filter',
          required: false,
          schema: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,2})?$'
          }
        },
        {
          name: 'inStock',
          in: 'query',
          description: 'Filter by stock availability',
          required: false,
          schema: {
            type: 'boolean'
          }
        },
        {
          name: 'sortBy',
          in: 'query',
          description: 'Sort by field',
          required: false,
          schema: {
            type: 'string',
            enum: ['name', 'price', 'createdAt', 'updatedAt', 'inventoryQuantity'],
            default: 'createdAt'
          }
        },
        {
          $ref: '#/components/parameters/SortOrderParam'
        },
        {
          $ref: '#/components/parameters/PageParam'
        },
        {
          $ref: '#/components/parameters/LimitParam'
        }
      ],
      responses: {
        '200': {
          description: 'Products retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  {
                    $ref: '#/components/schemas/PaginatedResponse'
                  },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Product'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/low-stock': {
    get: {
      tags: ['Products'],
      summary: 'Get low stock products',
      description: 'Retrieve products with low inventory levels (Admin only)',
      operationId: 'getLowStockProducts',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'threshold',
          in: 'query',
          description: 'Stock threshold',
          required: false,
          schema: {
            type: 'integer',
            minimum: 0,
            default: 5
          }
        }
      ],
      responses: {
        '200': {
          description: 'Low stock products retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/products/bulk-status': {
    patch: {
      tags: ['Products'],
      summary: 'Bulk update product status',
      description: 'Update status for multiple products (Admin only)',
      operationId: 'bulkUpdateProductStatus',
      security: [
        {
          bearerAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/BulkUpdateProductStatusRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Products updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true
                  },
                  message: {
                    type: 'string',
                    example: 'Products updated successfully'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      updatedCount: {
                        type: 'integer',
                        example: 5
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '403': {
          $ref: '#/components/responses/ForbiddenError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  }
} as const;

export default productPaths;
