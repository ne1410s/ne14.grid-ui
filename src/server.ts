import * as apiConfig from "./api.json"
import { Xprest } from "./xprest/xprest.js";

const xprest = new Xprest();

// Static resources
xprest.resource('/favicon.ico', '../../ui/favicon.ico');

// Dynamic resources
xprest.render('/', '../../ui/index.html', { myVar: { myProp: 2 } });

// Api endpoints
xprest.endpoint('/test/:omg', 'get', () => 47.5);

xprest.start(apiConfig.portNumber);
