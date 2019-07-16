import * as express from "express";
import * as apiConfig from "./api.json"
import * as path from "path";

const expr_api = express();

// Static resources
expr_api.get('/favicon.ico', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/favicon.ico')));
expr_api.get('/', (q, r) => r.sendFile(path.resolve(__dirname, '../ui/index.html')));

// Start!
expr_api.listen(apiConfig.portNumber, () => {
    console.log(`Listening on port ${apiConfig.portNumber}`);
});
