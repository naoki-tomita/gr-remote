import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";
import { Shoots } from "./Shoots";
import { Images } from "./Images";
import { Settings } from "./Settings";
import { MenuComponents } from "./MenuComponents";

export const App: React.StatelessComponent = () => {
  return (
    <BrowserRouter>
      <div>
        <MenuComponents
          linkLists={[
            { href: "/", label: "Shoots" },
            { href: "/images", label: "Images" },
            { href: "/settings", label: "Settings" },
          ]}
        />
        <Route exact path="/" component={Shoots} />
        <Route path="/images" component={Images} />
        <Route path="/settings" component={Settings} />
      </div>
    </BrowserRouter>
  );
};
