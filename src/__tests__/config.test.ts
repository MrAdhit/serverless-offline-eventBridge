import { setConfig } from '../config/config';

describe('setConfig', () => {
  it('should return default config when no options provided', () => {
    const config = setConfig({});

    expect(config.awsConfig.region).toBe('us-east-1');
    expect(config.awsConfig.accountId).toBe('000000000000');
    expect(config.localStackConfig.localStackEnabled).toBe(false);
    expect(config.localStackConfig.localStackEndpoint).toBe(
      'http://localhost:4566'
    );
    expect(config.eventBridgeMockServerConfig.shouldMockEventBridgeServer).toBe(
      true
    );
    expect(config.eventBridgeMockServerConfig.mockServerPort).toBe(4010);
    expect(config.eventBridgeMockServerConfig.mockMqttClientHostname).toBe(
      '127.0.0.1'
    );
    expect(config.eventBridgeMockServerConfig.mockMqttClientPubSubPort).toBe(
      4011
    );
    expect(config.eventBridgeMockServerConfig.payloadSizeLimit).toBe('10mb');
  });

  it('should override AWS region', () => {
    const config = setConfig({
      awsConfig: {
        region: 'eu-west-1',
      },
    });

    expect(config.awsConfig.region).toBe('eu-west-1');
    expect(config.awsConfig.accountId).toBe('000000000000'); // default preserved
  });

  it('should override AWS account ID', () => {
    const config = setConfig({
      awsConfig: {
        accountId: '123456789012',
      },
    });

    expect(config.awsConfig.accountId).toBe('123456789012');
    expect(config.awsConfig.region).toBe('us-east-1'); // default preserved
  });

  it('should enable localstack configuration', () => {
    const config = setConfig({
      localStackConfig: {
        localStackEnabled: true,
        localStackEndpoint: 'http://localstack:4566',
      },
    });

    expect(config.localStackConfig.localStackEnabled).toBe(true);
    expect(config.localStackConfig.localStackEndpoint).toBe(
      'http://localstack:4566'
    );
  });

  it('should override mock server port', () => {
    const config = setConfig({
      eventBridgeMockServerConfig: {
        mockServerPort: 5000,
      },
    });

    expect(config.eventBridgeMockServerConfig.mockServerPort).toBe(5000);
    expect(config.eventBridgeMockServerConfig.mockMqttClientHostname).toBe(
      '127.0.0.1'
    ); // default preserved
  });

  it('should override multiple mock server options', () => {
    const config = setConfig({
      eventBridgeMockServerConfig: {
        shouldMockEventBridgeServer: false,
        mockServerPort: 5000,
        mockMqttClientHostname: '0.0.0.0',
        mockMqttClientPubSubPort: 5001,
        payloadSizeLimit: '50mb',
      },
    });

    expect(config.eventBridgeMockServerConfig.shouldMockEventBridgeServer).toBe(
      false
    );
    expect(config.eventBridgeMockServerConfig.mockServerPort).toBe(5000);
    expect(config.eventBridgeMockServerConfig.mockMqttClientHostname).toBe(
      '0.0.0.0'
    );
    expect(config.eventBridgeMockServerConfig.mockMqttClientPubSubPort).toBe(
      5001
    );
    expect(config.eventBridgeMockServerConfig.payloadSizeLimit).toBe('50mb');
  });

  it('should set imported event buses', () => {
    const config = setConfig({
      eventBridgeMockServerConfig: {
        importedEventBuses: {
          ImportedBus: 'my-imported-bus',
        },
      },
    });

    expect(config.eventBridgeMockServerConfig.importedEventBuses).toEqual({
      ImportedBus: 'my-imported-bus',
    });
  });

  it('should enable debug mode', () => {
    const config = setConfig({
      pluginConfigOptions: {
        debug: true,
      },
    });

    expect(config.pluginConfigOptions?.debug).toBe(true);
  });

  it('should handle full configuration override', () => {
    const config = setConfig({
      awsConfig: {
        region: 'ap-southeast-1',
        accountId: '111111111111',
      },
      localStackConfig: {
        localStackEnabled: true,
        localStackEndpoint: 'http://custom-localstack:4566',
      },
      eventBridgeMockServerConfig: {
        shouldMockEventBridgeServer: false,
        mockServerPort: 9000,
        mockMqttClientHostname: 'mqtt.local',
        mockMqttClientPubSubPort: 9001,
        payloadSizeLimit: '100mb',
        importedEventBuses: {
          ExternalBus: 'external-bus-arn',
        },
      },
      pluginConfigOptions: {
        debug: true,
      },
    });

    expect(config.awsConfig.region).toBe('ap-southeast-1');
    expect(config.awsConfig.accountId).toBe('111111111111');
    expect(config.localStackConfig.localStackEnabled).toBe(true);
    expect(config.localStackConfig.localStackEndpoint).toBe(
      'http://custom-localstack:4566'
    );
    expect(config.eventBridgeMockServerConfig.shouldMockEventBridgeServer).toBe(
      false
    );
    expect(config.eventBridgeMockServerConfig.mockServerPort).toBe(9000);
    expect(config.eventBridgeMockServerConfig.mockMqttClientHostname).toBe(
      'mqtt.local'
    );
    expect(config.eventBridgeMockServerConfig.mockMqttClientPubSubPort).toBe(
      9001
    );
    expect(config.eventBridgeMockServerConfig.payloadSizeLimit).toBe('100mb');
    expect(config.eventBridgeMockServerConfig.importedEventBuses).toEqual({
      ExternalBus: 'external-bus-arn',
    });
    expect(config.pluginConfigOptions?.debug).toBe(true);
  });
});
