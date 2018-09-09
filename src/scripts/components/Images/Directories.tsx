import * as React from "react";
import { Directory, storage } from "../../models/States/Storage";

interface Props {
  dirs: Directory[];
}

function handleSelect(dir: Directory) {
  storage.currentDir = dir;
}

function renderDir(dir: Directory, i: number) {
  return (
    <li key={i}>
      <a onClick={() => handleSelect(dir)} href="#">
        {dir.name}
      </a>
    </li>
  );
}

export const Directories: React.StatelessComponent<Props> = ({ dirs }) => {
  return <ul>{dirs.map(renderDir)}</ul>;
};
