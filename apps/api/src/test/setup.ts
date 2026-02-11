// Mock environment variables for all tests
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.TURNKEY_API_PUBLIC_KEY = 'test-public-key';
process.env.TURNKEY_API_PRIVATE_KEY = 'test-private-key';
process.env.TURNKEY_ORGANIZATION_ID = 'test-org-id';
process.env.CELO_RPC_URL = 'https://forno.celo.org';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '4001';
process.env.PARALLEL_API_KEY = 'test-parallel-key';
process.env.GEMINI_CLI_AUTH_TYPE = 'oauth-personal';
