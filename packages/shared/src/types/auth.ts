export interface AuthUser {
  id: string;
  walletAddress: string;
}

export interface AuthPayload {
  address: string;
}

export interface AuthLoginRequest {
  payload: unknown;
  signature: string;
}

export interface AuthLoginResponse {
  token: string;
}
