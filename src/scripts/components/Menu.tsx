import * as React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { menu } from "../models/States/Menu";
import { Drawer } from "./Drawer";

interface Props {
  linkLists: Array<{
    href: string;
    label: string;
  }>;
}

const MenuHeader = styled.div``;

export class Menu extends React.Component<Props> {
  componentDidMount() {
    menu.on("drawerOpen", () => this.forceUpdate());
  }
  render() {
    return (
      <>
        <MenuHeader>
          <button onClick={this.handleOpen}>Menu</button>
        </MenuHeader>
        <Drawer open={menu.drawerOpen} onClose={this.handleClose}>
          <ul>{this.props.linkLists.map(this.renderMenuItems)}</ul>
        </Drawer>
      </>
    );
  }

  renderMenuItems = (link: { href: string; label: string }, index: number) => {
    return (
      <li key={index}>
        <Link to={link.href} onClick={this.handleClose}>
          {link.label}
        </Link>
      </li>
    );
  };

  handleOpen = () => {
    menu.drawerOpen = true;
  };

  handleClose = () => {
    menu.drawerOpen = false;
  };
}
