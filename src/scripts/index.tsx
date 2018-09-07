import * as React from "react";
import { render } from "react-dom";

import { App } from "./components/App";
import { init } from "./utils/ServiceWorker";

init();
render(<App />, document.getElementById("app"));
