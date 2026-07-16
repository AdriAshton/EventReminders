declare module 'speakeasy' {
  const speakeasy: {
    generateSecret(options?: { length?: number }): { base32?: string; otpauth_url?: string };
    totp: {
      verify(options: { secret: string; encoding: 'base32'; token: string; window?: number }): boolean;
    };
  };
  export = speakeasy;
}
