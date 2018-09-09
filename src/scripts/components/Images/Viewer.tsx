import * as React from "react";

interface Props {
  file: string;
}

export const Viewer: React.StatelessComponent<Props> = ({ file }) => {
  return <img src={file} />;
};
