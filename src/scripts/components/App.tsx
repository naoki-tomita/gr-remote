import * as React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Shoots } from "./Shoots";
import { Images } from "./Images";
import { Settings } from "./Settings";
import { Menu } from "./Menu";

export const App: React.StatelessComponent = () => {
  return (
    <BrowserRouter>
      <div>
        <Menu
          linkLists={[
            { href: "/", label: "Shoots" },
            { href: "/images", label: "Images" },
            { href: "/settings", label: "Settings" },
          ]}
        />
        <Switch>
          <Route path="/images" component={Images} />
          <Route path="/settings" component={Settings} />
          <Route path="/" component={Shoots} />
        </Switch>
      </div>
    </BrowserRouter>
  );
};
