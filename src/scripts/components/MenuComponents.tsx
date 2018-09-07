import * as React from "react";
import { Link } from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import ListItem from "@material-ui/core/ListItem";
import SwipeableDrawer from "@material-ui/core/SwipeableDrawer";
import MenuIcon from "@material-ui/icons/Menu";
import { menu } from "../models/States/Menu";

interface Props {
  linkLists: Array<{
    href: string;
    label: string;
  }>;
}

export class MenuComponents extends React.Component<Props> {
  componentDidMount() {
    menu.on("drawerOpen", () => this.forceUpdate());
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
          open={menu.drawerOpen}
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
    menu.drawerOpen = true;
  };

  handleClose = () => {
    menu.drawerOpen = false;
  };
}
