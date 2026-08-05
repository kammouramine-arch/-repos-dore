export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: number;
}

export interface Session {
  token: string;
  user: User;
  issuedAt: number;
  /**
   * When the session stops being valid. Local sessions expire on a fixed TTL;
   * a server-issued token will carry its own, and the field is already here.
   */
  expiresAt: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpDetails extends Credentials {
  fullName: string;
}
