// OpenAPI paths for User and Shipping Address endpoints

export const userPaths = {
  '/api/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get user profile',
      description: 'Retrieve the authenticated user\'s profile information',
      operationId: 'getUserProfile',
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        '200': {
          description: 'Profile retrieved successfully',
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
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    patch: {
      tags: ['Users'],
      summary: 'Update user profile',
      description: 'Update the authenticated user\'s profile information',
      operationId: 'updateUserProfile',
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
              $ref: '#/components/schemas/UpdateUserProfileRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Profile updated successfully',
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
                    example: 'Profile updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/User'
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
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/users/change-password': {
    patch: {
      tags: ['Users'],
      summary: 'Change password',
      description: 'Change the authenticated user\'s password',
      operationId: 'changePassword',
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
              $ref: '#/components/schemas/ChangePasswordRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password changed successfully',
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
                    example: 'Password changed successfully'
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
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  }
} as const;

export const shippingPaths = {
  '/api/shipping-addresses': {
    get: {
      tags: ['Shipping'],
      summary: 'Get user shipping addresses',
      description: 'Retrieve all shipping addresses for the authenticated user',
      operationId: 'getUserShippingAddresses',
      security: [
        {
          bearerAuth: []
        }
      ],
      responses: {
        '200': {
          description: 'Shipping addresses retrieved successfully',
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
                      $ref: '#/components/schemas/ShippingAddress'
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
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    post: {
      tags: ['Shipping'],
      summary: 'Create shipping address',
      description: 'Create a new shipping address for the authenticated user',
      operationId: 'createShippingAddress',
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
              $ref: '#/components/schemas/CreateShippingAddressRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Shipping address created successfully',
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
                    example: 'Shipping address created successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/ShippingAddress'
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
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/shipping-addresses/{id}': {
    get: {
      tags: ['Shipping'],
      summary: 'Get shipping address by ID',
      description: 'Retrieve a specific shipping address by its ID',
      operationId: 'getShippingAddressById',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Shipping address ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Shipping address retrieved successfully',
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
                    $ref: '#/components/schemas/ShippingAddress'
                  }
                }
              }
            }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
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
      tags: ['Shipping'],
      summary: 'Update shipping address',
      description: 'Update an existing shipping address',
      operationId: 'updateShippingAddress',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Shipping address ID',
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
              $ref: '#/components/schemas/UpdateShippingAddressRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Shipping address updated successfully',
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
                    example: 'Shipping address updated successfully'
                  },
                  data: {
                    $ref: '#/components/schemas/ShippingAddress'
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
        '404': {
          $ref: '#/components/responses/NotFoundError'
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    },
    delete: {
      tags: ['Shipping'],
      summary: 'Delete shipping address',
      description: 'Delete an existing shipping address',
      operationId: 'deleteShippingAddress',
      security: [
        {
          bearerAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Shipping address ID',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Shipping address deleted successfully',
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
                    example: 'Shipping address deleted successfully'
                  }
                }
              }
            }
          }
        },
        '401': {
          $ref: '#/components/responses/UnauthorizedError'
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

export default { ...userPaths, ...shippingPaths };
