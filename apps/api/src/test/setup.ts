// Mock environment variables for all tests
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.PRIVY_APP_ID = 'test-privy-app-id';
process.env.PRIVY_APP_SECRET = 'test-privy-app-secret';
process.env.CELO_RPC_URL = 'https://forno.celo.org';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4001';
process.env.PARALLEL_API_KEY = 'test-parallel-key';
process.env.GEMINI_CLI_AUTH_TYPE = 'oauth-personal';
