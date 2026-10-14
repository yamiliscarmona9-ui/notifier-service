import { KafkaOptions, Transport } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

export function getKafkaConfig(env: NodeJS.ProcessEnv = process.env): KafkaOptions['options'] {
  const brokers = (env.KAFKA_BROKERS || env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

  const clientId = env.KAFKA_CLIENT_ID || 'notifiers-service';
  const groupId = env.KAFKA_GROUP_ID || 'notifiers-service-group';

  // SSL Configuration (Required for Aiven Kafka)
  const isSslExplicit = env.KAFKA_SSL === 'true' || env.KAFKA_SSL_ENABLED === 'true';
  const hasAivenHost = brokers.some((b) => b.includes('aivencloud.com'));

  let ssl: any = false;

  if (isSslExplicit || hasAivenHost) {
    let caContent = env.KAFKA_CA_CERT;
    const caPath = env.KAFKA_CA_PATH || path.resolve(process.cwd(), 'ca.pem');

    if (!caContent && fs.existsSync(caPath)) {
      try {
        caContent = fs.readFileSync(caPath, 'utf-8');
      } catch {
        // Fallback to system CAs if file cannot be read
      }
    }

    ssl = {
      rejectUnauthorized: env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: caContent ? [caContent] : undefined,
    };
  }

  // SASL Configuration (Username / Password authentication for Aiven)
  const username = env.KAFKA_SASL_USERNAME || env.KAFKA_USERNAME;
  const password = env.KAFKA_SASL_PASSWORD || env.KAFKA_PASSWORD;
  const mechanism = (env.KAFKA_SASL_MECHANISM || 'plain').toLowerCase();

  let sasl: any = undefined;
  if (username && password) {
    sasl = {
      mechanism: mechanism as 'plain' | 'scram-sha-256' | 'scram-sha-512',
      username,
      password,
    };
  }

  return {
    client: {
      clientId,
      brokers,
      ssl: ssl || undefined,
      sasl,
    },
    consumer: {
      groupId,
      allowAutoTopicCreation: true,
    },
  };
}

export function getKafkaMicroserviceOptions(env: NodeJS.ProcessEnv = process.env): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: getKafkaConfig(env),
  };
}
