import { Express } from "./express/Express";
import { UrlJoin } from "./url-join/UrlJoin";

export interface ExternalDependencies {
    urlJoin: UrlJoin;
    express: Express;
}
