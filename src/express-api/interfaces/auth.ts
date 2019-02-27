export interface IAuthEntryRequest {
    username: string;
    password: string;
}

export interface ICaptchaRequest extends IAuthEntryRequest {
    recaptcha: string;
}

export interface IAuthEntryResponse {
    token: string;
    lifetime: number;
}

export interface IHashResult {
    hash: string;
    salt: string;
}

export interface ISecureRequest {
    authenticUserId: number;
}