import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { config } from '../config/config';

let sdk: NodeSDK | null = null;

export const initTracing = (): void => {
  if (!config.observability.enableTracing) {
    return;
  }
  
  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'amrutam-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  
  sdk.start();
  console.log('Tracing initialized');
};

export const shutdownTracing = async (): Promise<void> => {
  if (sdk) {
    await sdk.shutdown();
  }
};


