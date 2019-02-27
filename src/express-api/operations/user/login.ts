import { OperationBase, ValidationError } from "@ne1410s/http";
import { DbContext } from "../../../database/db-context";
import * as apiConfig from "../../../api.json";
import { AuthUtils } from "../../utils/auth";
import { AuthError } from "../../errors/auth";
import { IAuthEntryResponse, ICaptchaRequest } from "../../interfaces/auth";

export class LoginOperation extends OperationBase<ICaptchaRequest, IAuthEntryResponse> {

    constructor(private readonly db: DbContext) {
        super();
    }

    validateRequest(requestData: ICaptchaRequest): void {}
    validateResponse(responseData: IAuthEntryResponse): void {}

    protected async invokeInternal(requestData: ICaptchaRequest): Promise<IAuthEntryResponse> {

        await AuthUtils.validateRecaptcha(requestData.recaptcha, 'login');

        const result = await this.db.dbUser.findAll({
            where: { UserName: requestData.username }
        });

        const user = result[0] as any;

        let denyAuth = result.length !== 1;
        if (!denyAuth) {
            const testParams = { hash: user.PasswordHash, salt: user.PasswordSalt };
            denyAuth = !await AuthUtils.verifyHash(requestData.password, testParams);
        }

        if (denyAuth) {
            throw new AuthError();
        }

        return {
            token: await AuthUtils.getToken(user.UserID, apiConfig.tokenMinutes),
            lifetime: apiConfig.tokenMinutes * 60 * 1000
        };
    }

}