export interface DatadogConfig {
  apiKey: string;
  appKey: string;
}

export function getDatadogConfig(): DatadogConfig {
  const apiKey = process.env.DATADOG_API_KEY;
  const appKey = process.env.DATADOG_APP_KEY;

  if (!apiKey) {
    throw new Error('DATADOG_API_KEY environment variable is required');
  }
  if (!appKey) {
    throw new Error('DATADOG_APP_KEY environment variable is required');
  }

  return {
    apiKey,
    appKey
  };
} 