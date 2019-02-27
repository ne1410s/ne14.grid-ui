import { RegisterOperation } from "./register";
import { LoginOperation } from "./login";
import { DbContext } from "../../../database/db-context";

export class UserOperations {

    public readonly register: RegisterOperation;
    public readonly login: LoginOperation;

    constructor(db: DbContext) {

        this.register = new RegisterOperation(db);
        this.login = new LoginOperation(db);
    }
}