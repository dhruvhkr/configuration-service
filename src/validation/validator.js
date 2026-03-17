function validateConfigData(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Config must be a flat JSON object');
  }

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' || value === null) {
      throw new Error(`"${key}" must be a string, number, or boolean`);
    }
  }
}

function validateEnvironmentName(name) {
  if (!name || name.trim() === '') {
    throw new Error('Environment name cannot be empty');
  }
}

function validateServiceName(name) {
  if (!name || name.trim() === '') {
    throw new Error('Service name cannot be empty');
  }
}

module.exports = { validateConfigData, validateEnvironmentName, validateServiceName };
