import { getKafkaConfig, getKafkaMicroserviceOptions } from './kafka.config';
import { Transport } from '@nestjs/microservices';

describe('Kafka Config', () => {
  it('should parse default local kafka settings when no env provided', () => {
    const config = getKafkaConfig({});

    expect(config.client.brokers).toEqual(['localhost:9092']);
    expect(config.client.clientId).toBe('notifiers-service');
    expect(config.consumer.groupId).toBe('notifiers-service-group');
    expect(config.client.ssl).toBeUndefined();
    expect(config.client.sasl).toBeUndefined();
  });

  it('should parse Aiven SSL and SASL credentials properly', () => {
    const mockEnv: NodeJS.ProcessEnv = {
      KAFKA_BROKERS: 'kafka-project.aivencloud.com:12345',
      KAFKA_CLIENT_ID: 'custom-notifier',
      KAFKA_GROUP_ID: 'custom-group',
      KAFKA_SSL: 'true',
      KAFKA_CA_CERT: 'MOCK_CA_CERTIFICATE_STRING',
      KAFKA_SASL_USERNAME: 'avnadmin',
      KAFKA_SASL_PASSWORD: 'secretpassword',
      KAFKA_SASL_MECHANISM: 'scram-sha-256',
    };

    const config = getKafkaConfig(mockEnv);

    expect(config.client.brokers).toEqual(['kafka-project.aivencloud.com:12345']);
    expect(config.client.clientId).toBe('custom-notifier');
    expect(config.consumer.groupId).toBe('custom-group');
    expect(config.client.ssl).toEqual({
      rejectUnauthorized: true,
      ca: ['MOCK_CA_CERTIFICATE_STRING'],
    });
    expect(config.client.sasl).toEqual({
      mechanism: 'scram-sha-256',
      username: 'avnadmin',
      password: 'secretpassword',
    });
  });

  it('should return Transport.KAFKA in getKafkaMicroserviceOptions', () => {
    const options = getKafkaMicroserviceOptions({});
    expect(options.transport).toBe(Transport.KAFKA);
  });
});
