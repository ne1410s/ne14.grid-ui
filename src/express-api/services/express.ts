import { UserOperations } from "../operations/user/wrapped-up";
import { DbContext } from "../../database/db-context";

export class ExpressService {

    public readonly users: UserOperations;
    // grid, etc

    constructor(db: DbContext) {

        this.users = new UserOperations(db);
        // grid, etc
    }
}