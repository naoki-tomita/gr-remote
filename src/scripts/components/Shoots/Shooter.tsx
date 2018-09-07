import * as React from "react";
import IconButton from "@material-ui/core/IconButton";
import PhotoCamera from "@material-ui/icons/PhotoCamera";
import { api } from "../../apis";

export class Shooter extends React.Component {
  render() {
    return (
      <>
        <IconButton color="primary" onClick={this.handleShoot}>
          <PhotoCamera />
        </IconButton>
      </>
    );
  }

  handleShoot = async () => {
    await api.shoot();
  };
}
