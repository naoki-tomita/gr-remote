import * as React from "react";
import styled, { keyframes } from "styled-components";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DrawerOpenAnimation = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 0;
  }
`;

const DrawerCloseAnimation = keyframes`
  0% {
    left: 0;
  }
  100% {
    left: -100%;
  }
`;

const DrawerBody = styled.div<{ open: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 2;
  background-color: white;
  animation: ${({ open }) =>
      open ? DrawerOpenAnimation : DrawerCloseAnimation}
    0.6s ease forwards;
`;

const BackdropAppearAnimation = keyframes`
  0% {
    width: 0;
    opacity: 0;
  }
  1% {
    width: auto;
  }
  100% {
    width: auto;
    opacity: 100%;
  }
`;
const BackdropHiddenAnimation = keyframes`
  0% {
    width: auto;
    opacity: 100%;
  }
  99% {
    width: auto;
  }
  100% {
    width: 0;
    opacity: 0;
  }
`;

const Backdrop = styled.div<{ open: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.3);
  animation: ${({ open }) =>
      open ? BackdropAppearAnimation : BackdropHiddenAnimation}
    0.6s linear forwards;
`;

let opened = false;

export const Drawer: React.StatelessComponent<Props> = ({
  open,
  children,
  onClose,
}) => {
  open && (opened = true);
  return opened ? (
    <>
      <DrawerBody open={open}>{children}</DrawerBody>
      <Backdrop open={open} onClick={onClose} />
    </>
  ) : null;
};
