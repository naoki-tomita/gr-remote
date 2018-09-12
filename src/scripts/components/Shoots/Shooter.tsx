import * as React from "react";

import { ApiButton } from "../ApiButton";
import { Shutter } from "./Shutter";

interface State {
  cmd: string;
}

export class Shooter extends React.Component<{}, State> {
  state = { cmd: "" };
  render() {
    return (
      <>
        <input onChange={this.handleChangeText} />
        <Shutter />
        <ApiButton url="/_gr" formData={{ cmd: this.state.cmd }}>
          Shoot
        </ApiButton>
      </>
    );
  }

  handleChangeText: React.ChangeEventHandler<HTMLInputElement> = e => {
    this.setState({ cmd: e.target.value });
  };
}
