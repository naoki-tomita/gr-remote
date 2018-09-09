import * as React from "react";
import styled from "styled-components";

import { FocusModeTypes, shutter } from "../../models/States/Shutter";

const ShutterButton = styled.button``;

const FocusMode: React.StatelessComponent = () => (
  <select
    onChange={e => (shutter.mode = e.target.value as FocusModeTypes)}
    defaultValue={shutter.mode}
  >
    <option value={FocusModeTypes.AUTO}>{FocusModeTypes.AUTO}</option>
    <option value={FocusModeTypes.MANUAL}>{FocusModeTypes.MANUAL}</option>
  </select>
);

interface State {
  shooting: boolean;
}

export class Shutter extends React.Component<{}, State> {
  state = { shooting: false };
  render() {
    const { shooting } = this.state;
    return (
      <>
        <ShutterButton disabled={shooting} onClick={this.handleShutterClick}>
          Shutter
        </ShutterButton>
        <FocusMode />
      </>
    );
  }

  handleChange = (mode: FocusModeTypes) => (shutter.mode = mode);
  handleShutterClick = async () => {
    this.setState({ shooting: true });
    await shutter.shoot();
    this.setState({ shooting: false });
  };
}
