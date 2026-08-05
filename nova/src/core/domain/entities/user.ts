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
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpDetails extends Credentials {
  fullName: string;
}
