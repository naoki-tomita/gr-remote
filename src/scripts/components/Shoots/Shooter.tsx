import * as React from "react";

import { ApiButton } from "../ApiButton";
import { Shutter } from "./Shutter";

export class Shooter extends React.Component {
  render() {
    return (
      <>
        <Shutter />
        <ApiButton url="/v1/camera/shoot" formData={{ af: "camera" }}>
          Shoot
        </ApiButton>
        <ApiButton url="/v1/camera/shoot/start">ShootStart</ApiButton>
        <ApiButton url="/v1/camera/shoot/finish">ShootFinish</ApiButton>
        <ApiButton url="/v1/lens/focus/lock">FocusLock</ApiButton>
        <ApiButton url="/v1/lens/focus/unlock">FocusUnlock</ApiButton>
      </>
    );
  }
}
