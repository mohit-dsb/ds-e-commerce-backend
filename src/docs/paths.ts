// Combined OpenAPI paths for all endpoints
import authPaths from './auth-paths';
import productPaths from './product-paths';
import orderCartPaths from './order-cart-paths';
import userShippingPaths from './user-shipping-paths';

// Health check paths
export const healthPaths = {
  '/': {
    get: {
      tags: ['Health'],
      summary: 'API root endpoint',
      description: 'Get basic API information and health status',
      operationId: 'getApiRoot',
      responses: {
        '200': {
          description: 'API information retrieved successfully',
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
                    example: 'E-commerce Backend API'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      version: {
                        type: 'string',
                        example: '1.0.0'
                      },
                      status: {
                        type: 'string',
                        example: 'healthy'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      },
                      environment: {
                        type: 'string',
                        example: 'development'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check endpoint',
      description: 'Get detailed system health information',
      operationId: 'getHealthCheck',
      responses: {
        '200': {
          description: 'Health check completed successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/HealthResponse'
              }
            }
          }
        },
        '503': {
          description: 'Service unavailable',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'SERVICE_UNAVAILABLE'
                      },
                      message: {
                        type: 'string',
                        example: 'Service is temporarily unavailable'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

// Category paths (simplified for brevity)
export const categoryPaths = {
  '/api/categories': {
    get: {
      tags: ['Categories'],
      summary: 'Get all categories',
      description: 'Retrieve all product categories with optional filtering',
      operationId: 'getCategories',
      parameters: [
        {
          name: 'isActive',
          in: 'query',
          description: 'Filter by active status',
          required: false,
          schema: {
            type: 'boolean'
          }
        },
        {
          name: 'parentId',
          in: 'query',
          description: 'Filter by parent category ID',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Categories retrieved successfully',
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
                      $ref: '#/components/schemas/Category'
                    }
                  }
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    post: {
      tags: ['Categories'],
      summary: 'Create a new category',
      description: 'Create a new product category (Admin only)',
      operationId: 'createCategory',
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
              $ref: '#/components/schemas/CreateCategoryRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Category created successfully',
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
                    example: 'Category created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Category'
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

  '/api/categories/{id}': {
    get: {
      tags: ['Categories'],
      summary: 'Get category by ID',
      description: 'Retrieve a specific category by its ID',
      operationId: 'getCategoryById',
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Category ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Category retrieved successfully',
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
                    $ref: '#/components/schemas/Category'
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
      tags: ['Categories'],
      summary: 'Update a category',
      description: 'Update an existing category (Admin only)',
      operationId: 'updateCategory',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Category ID',
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
              $ref: '#/components/schemas/UpdateCategoryRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Category updated successfully',
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
                    example: 'Category updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/Category'
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
      tags: ['Categories'],
      summary: 'Delete a category',
      description: 'Delete an existing category (Admin only)',
      operationId: 'deleteCategory',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Category ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Category deleted successfully',
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
                    example: 'Category deleted successfully'
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
  }
} as const;

// Combine all paths
export const allPaths = {
  ...healthPaths,
  ...authPaths,
  ...categoryPaths,
  ...productPaths,
  ...orderCartPaths,
  ...userShippingPaths
  // Add other path imports here as needed
} as const;

export default allPaths;
