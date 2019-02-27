import { Crypto } from "@ne1410s/crypto";
import { IHashResult } from "../interfaces/auth";
import * as jwt from "jsonwebtoken";
import { ValidationError } from "@ne1410s/http";

export abstract class AuthUtils {

    private static readonly JWT_SECRET: string = process.env['grid::jwt'];
    private static readonly RECAPTCHA_URL: string = 'https://www.google.com/recaptcha/api/siteverify'; 

    public static async getHash(text: string): Promise<IHashResult> {
        
        const salt = await Crypto.randomString(),
              hash = await Crypto.digest(salt + text);

        return { hash, salt };
    }

    public static async verifyHash(text: string, test: IHashResult): Promise<boolean> {

        return await Crypto.digest(test.salt + text) == test.hash;
    }

    public static getToken(userId: number, minutes: number): string {
        
        const payload = {
            aud: ['customer'],
            exp: Math.floor(Date.now() / 1000) + (60 * minutes),
            iat: Math.floor(Date.now() / 1000),
            iss: 'Acme Express',
            sub: userId,
        };

        return jwt.sign(payload, AuthUtils.JWT_SECRET);
    }

    public static verifyToken(token: string): number {

        const payload = jwt.verify(token, AuthUtils.JWT_SECRET, {
            audience: 'customer',
            issuer: 'Acme Express',
        }) as any;

        return payload.sub;
    }

    public static async validateRecaptcha(token: string, action: string): Promise<any> {
        
        const url = `${AuthUtils.RECAPTCHA_URL}?response=${token}&secret=${process.env['grid::recaptcha']}`,
              response = await fetch(url, { method: 'POST' }),
              json = await response.json();

        let isValid = true;

        isValid = isValid && response.ok;
        isValid = isValid && json.success === true;       
        isValid = isValid && json.action === action;
        isValid = isValid && json.score >= 0.85;

        if (!isValid) {
            throw new ValidationError('The request is invalid', json, ['Data anomaly']);
        }
    }
}