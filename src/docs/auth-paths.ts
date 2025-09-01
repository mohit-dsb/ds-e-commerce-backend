// OpenAPI paths for Authentication endpoints

export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      description: 'Create a new user account with email and password',
      operationId: 'registerUser',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RegisterRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '409': {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'EMAIL_EXISTS',
                  message: 'Email already exists',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user with email and password',
      operationId: 'loginUser',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_CREDENTIALS',
                  message: 'Invalid email or password',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Request password reset',
      description: 'Send password reset token to user email',
      operationId: 'forgotPassword',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ForgotPasswordRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password reset email sent',
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
                    example: 'Password reset email sent'
                  }
                }
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/ValidationError'
        },
        '404': {
          description: 'User not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'USER_NOT_FOUND',
                  message: 'User with this email not found',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Reset password',
      description: 'Reset user password using reset token',
      operationId: 'resetPassword',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ResetPasswordRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password reset successful',
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
                    example: 'Password reset successful'
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
          description: 'Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_TOKEN',
                  message: 'Invalid or expired reset token',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  },

  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Refresh access token using refresh token from cookies',
      operationId: 'refreshToken',
      responses: {
        '200': {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '401': {
          description: 'Invalid or expired refresh token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INVALID_REFRESH_TOKEN',
                  message: 'Invalid or expired refresh token',
                  timestamp: '2024-01-15T10:30:00Z'
                }
              }
            }
          }
        },
        '500': {
          $ref: '#/components/responses/InternalServerError'
        }
      }
    }
  }
} as const;

export default authPaths;
