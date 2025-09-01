// Combined schemas for OpenAPI specification
import schemas from './schemas';
import productSchemas from './product-schemas';
import orderSchemas from './order-schemas';

// Merge all schemas into a single object
export const allSchemas = {
  ...schemas,
  ...productSchemas,
  ...orderSchemas
} as const;

export default allSchemas;
