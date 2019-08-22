import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as ejs from "ejs";
import * as express from "express";
import * as http from "http";
import * as path from "path";

export class Xprest {

    private readonly api: express.Application;

    constructor() {

        this.api = express();

        this.api.use(cors());
        this.api.use(bodyParser.json());
        this.api.engine('html', ejs.renderFile);
        this.api.engine('js', ejs.renderFile);
    }

    /**
     * Specifies a static file resource.
     * @param apiRoute The api route.
     * @param localPath The local file path.
     */
    resource(
        apiRoute: string,
        localPath: string): void {

        this.api['get'](apiRoute, (_req, res) => {
            res.sendFile(path.resolve(__dirname, localPath));
        });
    }

    /**
     * Specifies a dynamic file resource.
     * @param apiRoute The api route.
     * @param localPath The local file path.
     * @param variables Exposed in the rendering of the file. For example:
     *  <%= new Date().getTime() * myVar.myProp %>
     */
    render(
        apiRoute: string,
        localPath: string,
        variables: object): void {

        this.api['get'](apiRoute, (_req, res) => {
            res.render(path.resolve(__dirname, localPath), variables);
        });
    }

    /**
     * Specifies a restful api endpoint.
     * @param apiRoute The api route.
     * @param verb The verb.
     * @param handler Handles requests.
     */
    endpoint<TReq, TRes>(
        apiRoute: string,
        verb: 'post'|'get'|'delete'|'put',
        handler: (req: TReq) => TRes): void {

        this.api[verb](apiRoute, (req, res) => {
            const inObject = { ...req.body, ...req.query, ...req.params } as TReq;
            const outObject = handler(inObject);
            res.json(outObject);
        });
    }

    /**
     * Starts listening for the specified requests.
     * @param port The port.
     * @param onready Called once listening is in place. 
     */
    start(port: number, onready?: () => void): http.Server {
        return this.api.listen(port, onready);
    }
}