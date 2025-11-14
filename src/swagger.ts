import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Amrutam Telemedicine API',
      version: '1.0.0',
      description: 'Production-grade backend API for Amrutam telemedicine system',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    `${process.cwd()}/src/routes/*.ts`,
    `${__dirname}/../routes/*.ts`,
  ],
};

export const swaggerSpec = swaggerJsdoc(options);


