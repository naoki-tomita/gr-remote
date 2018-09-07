import * as React from "react";
import { BrowserRouter, Route, Link } from "react-router-dom";
import { Shoots } from "./Shoots";
import { Images } from "./Images";
import { Settings } from "./Settings";

export const App: React.StatelessComponent = () => {
  return (
    <BrowserRouter>
      <div>
        <ul>
          <li><Link to="/">Shoots</Link></li>
          <li><Link to="/images">Images</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
        <Route exact path="/" component={Shoots} />
        <Route path="/images" component={Images} />
        <Route path="/settings" component={Settings} />
      </div>
    </BrowserRouter>
  );
};
