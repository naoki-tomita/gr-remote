import * as React from "react";
import { Link } from "react-router-dom";
import { AppBar, Toolbar, IconButton, ListItem } from "@material-ui/core";
import SwipeableDrawer from "@material-ui/core/SwipeableDrawer";
import MenuIcon from "@material-ui/icons/Menu";
import { state, onUpdate } from "../models/States";

interface Props {
  linkLists: Array<{
    href: string;
    label: string;
  }>;
}

export class Menu extends React.Component<Props> {
  componentDidMount() {
    onUpdate(["drawerOpen"], () => this.forceUpdate());
  }
  render() {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="Menu"
              onClick={this.handleOpen}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <SwipeableDrawer
          open={state.drawerOpen}
          onClose={this.handleClose}
          onOpen={this.handleOpen}
        >
          {this.props.linkLists.map(this.renderMenuItems)}
        </SwipeableDrawer>
      </>
    );
  }

  renderMenuItems = (link: { href: string; label: string }, index: number) => {
    return (
      <ListItem key={index}>
        <Link to={link.href} onClick={this.handleClose}>
          {link.label}
        </Link>
      </ListItem>
    );
  };

  handleOpen = () => {
    state.drawerOpen = true;
  };

  handleClose = () => {
    state.drawerOpen = false;
  };
}
