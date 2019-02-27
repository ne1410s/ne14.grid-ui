import * as express from "express";
import * as cors from "cors";
import * as ejs from "ejs";
import * as bodyParser from "body-parser";
import * as apiConfig from "./api.json"
import * as path from "path";
import { ExpressService } from "./express-api/services/express";
import { DbContext } from "./database/db-context";
import { AuthUtils } from "./express-api/utils/auth.js";

const db = new DbContext();
const expr_svc = new ExpressService(db);
const expr_api = express();

const proc = (q: express.Request, r: express.Response, entity: string, operation: string) => {
    
    (expr_svc as any)[entity][operation].invoke({ ...q.body, ...q.query, ...q.params })
        .then((res: any) => r.json(res))
        .catch((err: any) => {
            do { err = err.cause || err }
            while (err.cause);

            const status = err.status || (err.errors ? 422 : 500);
            let message = err.toString();

            if (err.body) { 
                try { message = JSON.parse(err.body).detail; }
                catch(ex) { console.warn('Failed to get body detail', err.body, ex); }
            }

            r.status(status);
            r.json({ message, detail: err.errors });

            if (status === 500) console.error(err);
        });
};

/**
 * Secure process: requires a valid bearer token. 
 */
const sec_proc = (q: express.Request, r: express.Response, entity: string, operation: string) => {       
    
    try {
        const authHeader = q.header('authorization'),
              token = ((authHeader || '').match(/^[Bb]earer ([\w-]*\.[\w-]*\.[\w-]*)$/) || [])[1] || '',
              userId = AuthUtils.verifyToken(token);
              
        q.body = { ...q.body, ...q.query, ...q.params };
        q.body.authenticUserId = userId;

        proc(q, r, entity, operation);
    }
    catch(err) {
        r.status(401);
        r.json({ message: 'Error: Access denied' })
    } 
};

// defer api startup til db init
db.syncStructure().then(() => {

    expr_api.use(cors());
    expr_api.use(bodyParser.json());
    expr_api.engine('html', ejs.renderFile);
    expr_api.engine('js', ejs.renderFile);

    // Static resources
    expr_api.get('/style.css', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/style.css')));
    expr_api.get('/loading.svg', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/loading.svg')));
    expr_api.get('/favicon.ico', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/favicon.ico')));
    expr_api.get('/', (q, r) => r.render(path.resolve(__dirname, '../ui/index.html'), {
        'recaptcha': process.env['grid::recaptcha::public']
    }));
    expr_api.get('/main.js', (q, r) => r.render(path.resolve(__dirname, '../ui/main.js'), {
        'baseUrl': process.env['grid::svchost'],
        'recaptcha': process.env['grid::recaptcha::public'],
        'maxLifeMs': apiConfig.tokenMinutes * 60 * 1000
    }));

    // User Operations
    expr_api.post('/user', (q, r) => proc(q, r, 'users', 'register'));
    expr_api.post('/login', (q, r) => proc(q, r, 'users', 'login'));

    // Grid Operations

    // Grid Progress Operations

    // Start!
    expr_api.listen(apiConfig.portNumber, () => {
        console.log(`Listening on port ${apiConfig.portNumber}`);
    });
});
